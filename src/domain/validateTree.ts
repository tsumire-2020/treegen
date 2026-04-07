import path from "node:path";
import { treeNodeSchema } from "./schema.js";
import { TreeNode } from "./tree-node.js";

const INVALID_SEGMENT_PATTERNS = [/\.\./, /[<>:"|?*]/];

export function validateTree(nodes: TreeNode[]): void {
  if (nodes.length === 0) {
    throw new Error("tree構造が空です");
  }

  nodes.forEach((node) => validateNode(node));
  validateSiblingDuplicates(nodes);
}

function validateNode(node: TreeNode): void {
  treeNodeSchema.parse(node);

  if (node.name.trim().length === 0) {
    throw new Error("名前が空のノードがあります");
  }

  INVALID_SEGMENT_PATTERNS.forEach((pattern) => {
    if (pattern.test(node.name)) {
      throw new Error(`危険または不正な名前を検出しました: ${node.name}`);
    }
  });

  if (path.isAbsolute(node.name)) {
    throw new Error(`絶対パスは使用できません: ${node.name}`);
  }

  if (node.type === "file" && node.children.length > 0) {
    throw new Error(`ファイルの下に子ノードは置けません: ${node.name}`);
  }

  validateSiblingDuplicates(node.children);
  node.children.forEach((child) => validateNode(child));
}

function validateSiblingDuplicates(nodes: TreeNode[]): void {
  const seen = new Set<string>();

  for (const node of nodes) {
    const key = `${node.type}:${node.name}`;
    if (seen.has(key)) {
      throw new Error(`同一階層に重複があります: ${node.name}`);
    }
    seen.add(key);
  }
}
