import path from 'node:path';
import { readTextFile } from '../infra/fileSystem.js';
import { validateTree } from '../domain/validateTree.js';
import { TreeNode } from '../domain/tree-node.js';
import { fail, InputError } from '../utils/errors.js';
import { assembleRows, parseCsv, parseTable } from './rows.js';
import { selectTarget } from './markdown.js';
import { parseTreeLines, TreeStyle } from './parseTreeLines.js';
export type InputOptions = { inputFormat?: 'auto' | 'csv' | 'markdown'; source?: string; treeStyle?: TreeStyle };
function parseDocument(text: string, file: string, options: InputOptions = {}): TreeNode[] {
  if (options.inputFormat !== undefined && !['auto', 'csv', 'markdown'].includes(options.inputFormat)) fail('INVALID_OPTION', 'input-format は auto / csv / markdown です', undefined, options.inputFormat);
  if (options.treeStyle !== undefined && !['auto', 'indent', 'branches'].includes(options.treeStyle)) fail('INVALID_OPTION', 'tree-style は auto / indent / branches です', undefined, options.treeStyle);
  let format = options.inputFormat ?? 'auto';
  if (format === 'auto') {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.csv') format = 'csv';
    else if (ext === '.md' || ext === '.markdown') format = 'markdown';
    else fail('UNKNOWN_FORMAT', '--input-format を明示してください', undefined, file);
  }
  let nodes: TreeNode[];
  if (format === 'csv') {
    if (options.source !== undefined || options.treeStyle !== undefined) fail('INCOMPATIBLE_OPTION', 'CSV に source / tree-style は指定できません');
    nodes = assembleRows(parseCsv(text, file));
  } else {
    const target = selectTarget(text, file, options.source);
    const label = `${target.kind}:${target.number}`;
    if (target.kind === 'table') {
      if (options.treeStyle !== undefined) fail('INCOMPATIBLE_OPTION', '表に tree-style は指定できません');
      nodes = assembleRows(parseTable(target.text, file, target.startLine, label), true);
    } else nodes = parseTreeLines(target.text, { style: options.treeStyle, file, startLine: target.startLine, target: label, fenceIndent: target.indent });
  }
  validateTree(nodes);
  return nodes;
}
export function parseInput(text: string, file: string, options: InputOptions = {}): TreeNode[] {
  try {
    return parseDocument(text, file, options);
  } catch (error) {
    if (error instanceof InputError) {
      throw new InputError(error.diagnostics.map(diagnostic => ({ ...diagnostic, file })));
    }
    throw error;
  }
}
export async function loadInput(file: string, options: InputOptions = {}): Promise<TreeNode[]> {
  return parseInput(await readTextFile(file), file, options);
}
