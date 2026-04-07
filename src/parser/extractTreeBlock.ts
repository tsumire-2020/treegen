const TREE_BLOCK_REGEX = /```tree\s*([\s\S]*?)```/m;

export function extractTreeBlock(markdown: string): string {
  const match = markdown.match(TREE_BLOCK_REGEX);

  if (!match || !match[1]) {
    throw new Error("treeコードブロックが見つかりませんでした");
  }

  return match[1].trimEnd();
}
