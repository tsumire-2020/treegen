import { TreeNode } from '../domain/tree-node.js';
import { normalizeLine } from './normalizeLine.js';
import { fail, range } from '../utils/errors.js';
export type TreeStyle = 'auto' | 'indent' | 'branches';
export type TreeParseOptions = { style?: TreeStyle; file?: string; startLine?: number; target?: string; fenceIndent?: number };
export function parseTreeLines(treeBlock: string, options: TreeParseOptions = {}): TreeNode[] {
  const lines = treeBlock.split(/\r?\n/).map((raw, i) => {
    const line = (options.startLine ?? 1) + i;
    if (/[\x00-\x1f\x7f-\x9f]/.test(raw)) fail('TREE_SYNTAX', 'タブ・制御文字・色エスケープは使用できません', range(options.file ?? '<input>', line, 1, Array.from(raw).length + 1, options.target), raw);
    const removed = Math.min(raw.match(/^ */)![0].length, options.fenceIndent ?? 0);
    return { raw: normalizeLine(raw.slice(removed)), line, column: removed + 1, endColumn: Array.from(raw).length + 1 };
  }).filter(l => l.raw.trim());
  const hasBranches = lines.some(l => /^[ │]*[├└│]/.test(l.raw));
  const style = options.style === undefined || options.style === 'auto' ? (hasBranches ? 'branches' : 'indent') : options.style;
  const roots: TreeNode[] = [], stack: TreeNode[] = [];
  const metadata = new Map<TreeNode, { connector: string; prefixes: string[]; raw: string }>();
  for (const { raw, line, column, endColumn } of lines) {
    const source = range(options.file ?? '<input>', line, column, endColumn, options.target);
    if (/\t|\x1b/.test(raw) || /^\s*\d+ director(?:y|ies)(?:,|$)/.test(raw)) fail('TREE_SYNTAX', 'タブ・色エスケープ・集計行は使用できません', source, raw);
    let depth = 0, name = '', connector = '';
    const prefixes: string[] = [];
    if (style === 'branches') {
      let rest = raw;
      while (rest.startsWith('│   ') || rest.startsWith('    ')) { prefixes.push(rest.slice(0, 4)); rest = rest.slice(4); }
      const match = rest.match(/^(├── |└── )(.*)$/);
      if (match) { connector = match[1]; depth = prefixes.length + 1; name = match[2].trim(); }
      else {
        if (prefixes.length || /^[\s├└│]/.test(rest)) fail('TREE_CONNECTOR', '不完全な接続子または形式混在です', source, raw);
        name = rest.trim();
      }
    } else {
      const spaces = raw.match(/^ */)![0].length;
      if (spaces % 2) fail('TREE_DEPTH', '不正なインデントです', source, raw);
      depth = spaces / 2; name = raw.trim();
      // Explicit indent permits branch-like names, while auto never falls back.
    }
    if (depth > stack.length) fail('TREE_DEPTH', 'インデントの階層が不正です', source, raw);
    const directory = name.endsWith('/');
    const node: TreeNode = { name: directory ? name.slice(0, -1) : name, type: directory ? 'directory' : 'file', depth, children: [], source };
    stack.length = depth;
    if (depth) stack[depth - 1].children.push(node); else roots.push(node);
    stack.push(node); metadata.set(node, { connector, prefixes, raw });
  }
  if (style === 'branches') {
    function check(siblings: TreeNode[], ancestors: boolean[]): void {
      siblings.forEach((node, i) => {
        const meta = metadata.get(node)!;
        const more = i < siblings.length - 1;
        if (node.depth && meta.connector !== (more ? '├── ' : '└── ')) fail('TREE_CONNECTOR', '最後の兄弟は └──、後続兄弟がある場合は ├── が必要です', node.source, meta.raw);
        // Root has no connector and no continuation column of its own.
        if (meta.prefixes.some((p, j) => p !== (ancestors[j] ? '│   ' : '    '))) fail('TREE_CONTINUATION', '祖先の継続線が不整合です', node.source, meta.raw);
        check(node.children, node.depth ? [...ancestors, more] : []);
      });
    }
    check(roots, []);
  }
  return roots;
}
