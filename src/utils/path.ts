import path from "node:path";
import { TreeNode } from "../domain/tree-node.js";

export type FlattenedPath = {
  type: "file" | "directory";
  path: string;
};

export function flattenTreePaths(nodes: TreeNode[]): FlattenedPath[] {
  const result: FlattenedPath[] = [];

  for (const node of nodes) {
    walk(node, "", result);
  }

  return result;
}

function walk(node: TreeNode, parentPath: string, result: FlattenedPath[]): void {
  const currentPath = path.join(parentPath, node.name);
  result.push({ type: node.type, path: currentPath });

  node.children.forEach((child) => walk(child, currentPath, result));
}
