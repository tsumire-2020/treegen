import { TreeNode } from "../domain/tree-node.js";
import { normalizeLine } from "./normalizeLine.js";

const INDENT_SIZE = 2;

type StackItem = {
  depth: number;
  node: TreeNode;
};

export function parseTreeLines(treeBlock: string): TreeNode[] {
  const lines = treeBlock
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter((line) => line.trim().length > 0);

  const roots: TreeNode[] = [];
  const stack: StackItem[] = [];

  for (const rawLine of lines) {
    const leadingSpaces = rawLine.match(/^\s*/)?.[0].length ?? 0;

    if (leadingSpaces % INDENT_SIZE !== 0) {
      throw new Error(`不正なインデントです: ${rawLine}`);
    }

    const depth = leadingSpaces / INDENT_SIZE;
    const trimmed = rawLine.trim();
    const isDirectory = trimmed.endsWith("/");
    const name = isDirectory ? trimmed.slice(0, -1) : trimmed;

    const node: TreeNode = {
      name,
      type: isDirectory ? "directory" : "file",
      depth,
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
      stack.pop();
    }

    if (depth > 0) {
      const expectedParentDepth = depth - 1;
      const parentInfo = stack[stack.length - 1];
      if (!parentInfo || parentInfo.depth !== expectedParentDepth) {
        throw new Error(`インデントの階層が不正です: ${rawLine}`);
      }
    }

    const parent = stack[stack.length - 1]?.node;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push({ depth, node });
  }

  return roots;
}
