import type { SourceRange } from "../utils/errors.js";
export type NodeType = "file" | "directory";

export type TreeNode = {
  name: string;
  type: NodeType;
  depth: number;
  children: TreeNode[];
  source?: SourceRange;
  fields?: Record<string, SourceRange>;
};
