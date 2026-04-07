import { Command } from "commander";
import { readTextFile } from "../infra/fileSystem.js";
import { logger } from "../infra/logger.js";
import { extractTreeBlock } from "../parser/extractTreeBlock.js";
import { parseTreeLines } from "../parser/parseTreeLines.js";
import { validateTree } from "../domain/validateTree.js";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("Markdownのtree構造を検証する")
    .requiredOption("-i, --input <path>", "入力Markdownファイル")
    .action(async (options) => {
      const markdown = await readTextFile(options.input);
      const treeBlock = extractTreeBlock(markdown);
      const rootNodes = parseTreeLines(treeBlock);
      validateTree(rootNodes);
      logger.success("tree構造は有効です");
    });
}
