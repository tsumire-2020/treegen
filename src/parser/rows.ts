import { TreeNode } from '../domain/tree-node.js';
import { unsafeName } from '../domain/validateTree.js';
import { Diagnostic, InputError, SourceRange, fail, range } from '../utils/errors.js';
export type Cell = { value: string; source: SourceRange };
export type Row = Cell[];

export function parseCsv(text: string, file = '<input>'): Row[] {
  if (text.startsWith('\uFEFF')) text = text.slice(1);
  const chars = Array.from(text);
  let i = 0, line = 1, col = 1, record = 0;
  const rows: Row[] = [];
  function advance(): string {
    const c = chars[i++];
    if (c === '\r' && chars[i] === '\n') { i++; line++; col = 1; return '\n'; }
    if (c === '\n') { line++; col = 1; } else col++;
    return c;
  }
  while (i < chars.length) {
    if (chars[i] === '\n' || (chars[i] === '\r' && chars[i + 1] === '\n')) { advance(); continue; }
    const row: Row = [];
    while (true) {
      const source = range(file, line, col, col, 'csv');
      if (rows.length) source.record = record + 1;
      let value = '';
      if (chars[i] === '"') {
        advance(); let closed = false;
        while (i < chars.length) {
          if (chars[i] === '"') {
            advance();
            if (chars[i] === '"') { value += advance(); continue; }
            closed = true; break;
          }
          value += advance();
        }
        if (!closed) fail('CSV_SYNTAX', '閉じない引用符です', { ...source, endLine: line, endColumn: col }, value);
        if (i < chars.length && ![',', '\n', '\r'].includes(chars[i])) fail('CSV_SYNTAX', '引用符の後は区切りのみ使用できます', { ...source, endLine: line, endColumn: col }, value);
      } else {
        while (i < chars.length && ![',', '\n', '\r'].includes(chars[i])) {
          if (chars[i] === '"') fail('CSV_SYNTAX', '非引用セルの引用符です', { ...source, endLine: line, endColumn: col }, value);
          value += advance();
        }
      }
      source.endLine = line; source.endColumn = col;
      if (rows.length) source.record = record + 1;
      row.push({ value, source });
      if (chars[i] === ',') { advance(); continue; }
      if (chars[i] === '\r' && chars[i + 1] !== '\n') fail('CSV_SYNTAX', '改行は LF / CRLF を使用してください', source, '\r');
      if (i < chars.length) advance();
      break;
    }
    if (rows.length) record++;
    rows.push(row);
  }
  return rows;
}

// Split before unescaping; pipes within code spans are never delimiters.
export function tableCells(line: string, file: string, lineNumber: number, target?: string, strict = false): Row {
  const chars = Array.from(line);
  const result: Row = [];
  let start = 0, code = 0;
  function push(end: number): void {
    const raw = chars.slice(start, end).join('');
    const leading = Array.from(raw.match(/^\s*/)?.[0] ?? '').length;
    const trimmed = raw.trim();
    result.push({ value: trimmed.replace(/\\([\\|])/g, '$1'), source: range(file, lineNumber, start + leading + 1, start + leading + Array.from(trimmed).length + 1, target) });
  }
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '\\' && ['\\', '|'].includes(chars[i + 1])) { i++; continue; }
    if (chars[i] === '`') {
      let n = 1; while (chars[i + n] === '`') n++;
      if (!code) code = n; else if (code === n) code = 0;
      i += n - 1; continue;
    }
    if (chars[i] === '|' && !code) { push(i); start = i + 1; }
  }
  if (strict && code) fail('TABLE_SYNTAX', '閉じないコードスパンです', range(file, lineNumber, start + 1, chars.length + 1, target), line);
  push(chars.length);
  if (line.trimStart().startsWith('|')) result.shift();
  // An escaped final pipe belongs to the cell, not the frame.
  let backslashes = 0; const trimmed = line.trimEnd();
  for (let i = trimmed.length - 2; i >= 0 && trimmed[i] === '\\'; i--) backslashes++;
  if (trimmed.endsWith('|') && backslashes % 2 === 0) result.pop();
  return result;
}
export function isTableSeparator(line: string): boolean {
  const cells = tableCells(line, '<input>', 1);
  return cells.length > 0 && cells.every(c => /^:?-{3,}:?$/.test(c.value));
}
export function parseTable(text: string, file: string, startLine: number, target: string): Row[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2 || !isTableSeparator(lines[1])) fail('TABLE_SYNTAX', '表の区切り行が必要です', range(file, startLine, 1, 1, target));
  const columns = tableCells(lines[0], file, startLine, target, true).length;
  if (tableCells(lines[1], file, startLine + 1, target, true).length !== columns) fail('TABLE_SYNTAX', 'ヘッダーと区切り行の列数が一致しません', range(file, startLine + 1, 1, Array.from(lines[1]).length + 1, target), lines[1]);
  return lines.filter((_, i) => i !== 1).map((l, i) => tableCells(l, file, startLine + (i ? i + 1 : 0), target, true));
}

export function assembleRows(rows: Row[], markdown = false): TreeNode[] {
  if (!rows.length) fail('MISSING_HEADER', 'ヘッダーが必要です');
  const errors: Diagnostic[] = [];
  const header = rows[0];
  const names = header.map(c => c.value.trim());
  const indexes = new Map<string, number>();
  function error(code: string, message: string, cell?: Cell, field?: string, related?: SourceRange[]): void {
    errors.push({ code, message, source: cell?.source, value: cell?.value, field, related });
  }
  names.forEach((name, i) => {
    const prior = indexes.get(name);
    if (prior !== undefined) error('DUPLICATE_HEADER', '同名ヘッダーです', header[i], name, [header[prior].source]);
    else indexes.set(name, i);
  });
  const idMode = indexes.has('id') || indexes.has('parent_id');
  const pathMode = indexes.has('parent_path');
  if (idMode && pathMode) error('MIXED_MODE', '親子方式の列が混在しています', header[0]);
  if (!idMode && !pathMode) error('MISSING_HEADER', '親子方式の列が必要です', header[0]);
  const required = idMode ? ['id', 'parent_id', 'name', 'type'] : ['parent_path', 'name', 'type'];
  required.forEach(n => { if (!indexes.has(n)) error('MISSING_HEADER', `必須列 ${n} がありません`, { value: '', source: header[0].source }, n); });
  if (errors.length) throw new InputError(errors);
  type Entry = { node: TreeNode; cells: Record<string, Cell>; parent?: Entry; key: string };
  const entries: Entry[] = [];
  const index = new Map<string, Entry>();
  for (const row of rows.slice(1)) {
    if (row.length !== header.length) {
      const last = row[row.length - 1];
      error('COLUMN_COUNT', `列数は ${header.length} 必要です`, { value: row.map(c => c.value).join(','), source: { ...row[0].source, endLine: last.source.endLine, endColumn: last.source.endColumn } });
      continue;
    }
    const cells: Record<string, Cell> = {};
    required.forEach(n => { cells[n] = row[indexes.get(n)!]; });
    if (markdown) required.forEach(n => {
      if (/`|<[^>]*>|&(?:#\w+|[A-Za-z][\w]*);|!?\[[^\]]*\]\s*(?:\([^)]*\)|\[[^\]]*\])|(?:^|\s)(?:\*{1,2}|_{1,2})\S.*(?:\*{1,2}|_{1,2})(?:$|\s)/.test(cells[n].value)) error('CELL_DECORATION', '対象セルは平文のみ使用できます', cells[n], n);
    });
    const name = cells.name.value, type = cells.type.value;
    if (unsafeName(name) || name.includes('/')) error('INVALID_NAME', 'name は安全な単一セグメントで指定してください', cells.name, 'name');
    if (type !== 'file' && type !== 'directory') error('INVALID_TYPE', 'type は file / directory のみです', cells.type, 'type');
    if (idMode && (!cells.id.value.trim() || /[\x00-\x1f\x7f-\x9f]/.test(cells.id.value))) error('INVALID_ID', 'id は非空の文字列です', cells.id, 'id');
    const parentCell = cells[idMode ? 'parent_id' : 'parent_path'];
    if (parentCell.value && (!parentCell.value.trim() || /[\x00-\x1f\x7f-\x9f]/.test(parentCell.value) || (!idMode && (unsafeName(parentCell.value) || parentCell.value.split('/').some(s => s === '..'))))) error('UNSAFE_PATH', '不正な親参照です', parentCell, idMode ? 'parent_id' : 'parent_path');
    const node: TreeNode = { name, type: type === 'directory' ? 'directory' : 'file', depth: 0, children: [], source: cells.name.source, fields: Object.fromEntries(required.map(n => [n, cells[n].source])) };
    const key = idMode ? cells.id.value : (parentCell.value ? `${parentCell.value}/` : '') + name;
    const entry: Entry = { node, cells, key };
    const prior = index.get(key);
    if (prior) error(idMode ? 'DUPLICATE_ID' : 'OUTPUT_COLLISION', '重複した定義です', cells[idMode ? 'id' : 'name'], idMode ? 'id' : 'name', [prior.cells[idMode ? 'id' : 'name'].source]);
    else index.set(key, entry);
    entries.push(entry);
  }
  for (const entry of entries) {
    const cell = entry.cells[idMode ? 'parent_id' : 'parent_path'];
    if (!cell.value) continue;
    entry.parent = index.get(cell.value);
    if (!entry.parent) error('PARENT_NOT_FOUND', '参照先の親がありません', cell, idMode ? 'parent_id' : 'parent_path');
    else if (entry.parent.cells.type.value === 'file') error('FILE_HAS_CHILD', 'ファイルの下に子ノードは置けません', cell, idMode ? 'parent_id' : 'parent_path', [entry.parent.cells.type.source, entry.parent.cells.name.source]);
  }
  const done = new Set<Entry>();
  for (const entry of entries) {
    const chain: Entry[] = [], visiting = new Set<Entry>();
    let cursor: Entry | undefined = entry;
    while (cursor && !done.has(cursor) && !visiting.has(cursor)) { visiting.add(cursor); chain.push(cursor); cursor = cursor.parent; }
    if (cursor && visiting.has(cursor)) {
      const cycle = chain.slice(chain.indexOf(cursor));
      error('CYCLE', `循環参照: ${[...cycle.map(e => e.key), cursor.key].join(' → ')}`, cursor.cells[idMode ? 'parent_id' : 'parent_path'], idMode ? 'parent_id' : 'parent_path', cycle.flatMap(e => [e.cells[idMode ? 'id' : 'name'].source, e.cells[idMode ? 'parent_id' : 'parent_path'].source]));
    }
    chain.forEach(e => done.add(e));
  }
  if (errors.length) throw new InputError(errors);
  const roots: TreeNode[] = [];
  entries.forEach(e => { if (e.parent) e.parent.node.children.push(e.node); else roots.push(e.node); });
  function depth(node: TreeNode, d: number): void { node.depth = d; node.children.forEach(n => depth(n, d + 1)); }
  roots.forEach(n => depth(n, 0));
  return roots;
}
