import { fail, range } from '../utils/errors.js';
import { isTableSeparator, tableCells } from './rows.js';
export type MarkdownTarget = { kind: 'tree' | 'table'; number: number; startLine: number; text: string; closed: boolean; indent?: number };

// Raw HTML blocks have either a dedicated terminator (types 1–5) or end
// at a blank line (types 6–7). Closing a block tag does not end type 6.
const blockTag = /^ {0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \t]|\/?>|$)/i;
const standaloneTag = /^ {0,3}(?:<[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9_.:-]*(?:[ \t]*=[ \t]*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*[ \t]*\/?>|<\/[A-Za-z][A-Za-z0-9-]*[ \t]*>)[ \t]*$/;
function htmlBlockEnd(raw: string, paragraph: boolean): RegExp | undefined {
  const special = raw.match(/^ {0,3}<(script|pre|style|textarea)(?:[ \t]|>|$)/i);
  if (special) return new RegExp(`</${special[1]}>`, 'i');
  if (/^ {0,3}<!--/.test(raw)) return /-->/;
  if (/^ {0,3}<\?/.test(raw)) return /\?>/;
  if (/^ {0,3}<![A-Z]/.test(raw)) return />/;
  if (/^ {0,3}<!\[CDATA\[/.test(raw)) return /\]\]>/;
  if (blockTag.test(raw) || (!paragraph && standaloneTag.test(raw))) return /^\s*$/;
  return undefined;
}
export function enumerateTargets(text: string, file = '<input>'): MarkdownTarget[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const targets: MarkdownTarget[] = [];
  let tree = 0, table = 0, listIndent = 0;
  let htmlEnd: RegExp | undefined;
  let paragraph = false;
  for (let i = 0; i < lines.length; i++) {
    // Track containers before recognizing targets. Fenced examples, list
    // continuations and raw HTML must not contribute candidate numbers.
    const raw = lines[i];
    if (htmlEnd) {
      if (htmlEnd.test(raw)) htmlEnd = undefined;
      continue;
    }
    if (!raw.trim()) { paragraph = false; continue; }
    const item = raw.match(/^ {0,3}(?:[-+*]|\d+[.)]) +/);
    if (item) { listIndent = item[0].length; paragraph = false; continue; }
    const indentation = raw.match(/^ */)![0].length;
    if (listIndent && indentation >= listIndent) continue;
    listIndent = 0;
    if (/^ {0,3}>/.test(raw)) { paragraph = false; continue; }
    const end = htmlBlockEnd(raw, paragraph);
    if (end) {
      if (!end.test(raw)) htmlEnd = end;
      paragraph = false;
      continue;
    }
    const fence = lines[i].match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
    if (fence) {
      paragraph = false;
      const start = i, marker = fence[2][0], width = fence[2].length;
      const candidate = fence[3].trim() === 'tree';
      i++;
      while (i < lines.length && !new RegExp(`^ {0,3}${marker}{${width},}\\s*$`).test(lines[i])) i++;
      if (candidate) targets.push({ kind: 'tree', number: ++tree, startLine: start + 2, text: lines.slice(start + 1, i).join('\n'), closed: i < lines.length, indent: fence[1].length });
      continue;
    }
    if (/^(?: {4}|\t| {0,3}>| {0,3}[-+*] | {0,3}\d+[.)] )/.test(lines[i]) || i + 1 >= lines.length || !isTableSeparator(lines[i + 1])) {
      const boundary: boolean = /^(?: {4}|\t| {0,3}#{1,6}(?:\s|$))/.test(raw) ||
        /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$/.test(raw) ||
        (paragraph && /^ {0,3}(?:=+|-+)[ \t]*$/.test(raw));
      paragraph = !boundary;
      continue;
    }
    paragraph = false;
    const header = tableCells(lines[i], file, i + 1).map(c => c.value.trim());
    const candidate = header.some(h => h === 'name' || h === 'type') && header.some(h => ['id', 'parent_id', 'parent_path'].includes(h));
    const start = i;
    i += 2;
    // Block starts end a table even when they contain pipes. A table is not
    // a paragraph, so standalone HTML tags can start a block here too.
    while (i < lines.length && lines[i].trim()) {
      const row = lines[i];
      if (htmlBlockEnd(row, false) ||
        /^(?: {4}|\t| {0,3}(?:>|`{3,}|~{3,}|#{1,6}(?:\s|$)|[-+*] |\d+[.)] ))/.test(row) ||
        /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$/.test(row)) break;
      // Keep ordinary rows, including those missing pipes, for cell validation.
      i++;
    }
    if (candidate) targets.push({ kind: 'table', number: ++table, startLine: start + 1, text: lines.slice(start, i).join('\n'), closed: true });
    i--; // Reprocess the boundary line in the outer container scanner.
  }
  return targets;
}
export function selectTarget(text: string, file = '<input>', source?: string): MarkdownTarget {
  const targets = enumerateTargets(text, file);
  let chosen: MarkdownTarget | undefined;
  if (source !== undefined) {
    if (!/^(tree|table):[1-9]\d*$/.test(source)) fail('INVALID_SOURCE', 'source は tree:N / table:N で指定してください', undefined, source);
    chosen = targets.find(t => `${t.kind}:${t.number}` === source);
    if (!chosen) fail('SOURCE_NOT_FOUND', '指定された対象番号がありません', undefined, source);
  } else {
    chosen = targets.find(t => t.kind === 'tree');
    if (!chosen) {
      const tables = targets.filter(t => t.kind === 'table');
      if (tables.length > 1) fail('AMBIGUOUS_SOURCE', `--source を指定してください: ${tables.map(t => `table:${t.number} line ${t.startLine}`).join(', ')}`);
      chosen = tables[0];
    }
  }
  if (!chosen) fail('NO_TARGET', 'treeコードブロックまたは候補表が見つかりませんでした');
  if (!chosen.closed) fail('UNCLOSED_FENCE', 'tree フェンスが閉じていません', range(file, chosen.startLine - 1, 1), chosen.text);
  return chosen;
}
