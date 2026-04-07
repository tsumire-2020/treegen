export type NodeType = "file" | "directory";

export type TreeNode = {
  name: string;
  type: NodeType;
  depth: number;
  children: TreeNode[];
};
