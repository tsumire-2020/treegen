import path from "node:path";
import { treeNodeSchema } from "./schema.js";
import { TreeNode } from "./tree-node.js";
import { Diagnostic, InputError } from "../utils/errors.js";

export function unsafeName(name: string): boolean {
  return !name.trim() || name === '.' || /\.\.|[<>:"|?*\x00-\x1f\x7f-\x9f\\]/.test(name) || path.isAbsolute(name) || /^[A-Za-z]:/.test(name) || name.split('/').some(s => !s || s === '.');
}
export function validateTree(nodes: TreeNode[]): void {
  const errors: Diagnostic[] = [];
  const seen = new Map<string, TreeNode>();
  if (!nodes.length) errors.push({ code: 'EMPTY_TREE', message: 'tree構造が空です' });
  function walk(node: TreeNode, parent: string): void {
    treeNodeSchema.parse(node);
    const output = parent ? `${parent}/${node.name}` : node.name;
    if (unsafeName(node.name)) errors.push({ code: 'INVALID_NAME', message: '危険または不正な名前です', source: node.fields?.name ?? node.source, field: 'name', value: node.name });
    const key = output.toLowerCase();
    const prior = seen.get(key);
    if (prior) errors.push({ code: 'OUTPUT_COLLISION', message: '同一出力先に重複があります（大小文字・型を問わず拒否）', source: node.source, field: 'path', value: output, related: [prior.source, prior.fields?.parent_path, node.fields?.parent_path, prior.fields?.parent_id, node.fields?.parent_id].filter((s): s is NonNullable<typeof s> => !!s) });
    else seen.set(key, node);
    if (node.type === 'file' && node.children.length) {
      for (const child of node.children) errors.push({ code: 'FILE_HAS_CHILD', message: 'ファイルの下に子ノードは置けません', source: child.fields?.parent_id ?? child.fields?.parent_path ?? child.source, value: node.name, related: [node.fields?.type ?? node.source].filter((s): s is NonNullable<typeof s> => !!s) });
    }
    node.children.forEach(child => walk(child, output));
  }
  nodes.forEach(n => walk(n, ''));
  if (errors.length) throw new InputError(errors);
}
