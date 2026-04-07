import { Command } from "commander";
import { readTextFile } from "../infra/fileSystem.js";
import { logger } from "../infra/logger.js";
import { extractTreeBlock } from "../parser/extractTreeBlock.js";
import { parseTreeLines } from "../parser/parseTreeLines.js";
import { flattenTreePaths } from "../utils/path.js";

export function registerPreviewCommand(program: Command): void {
  program
    .command("preview")
    .description("生成予定のパス一覧を表示する")
    .requiredOption("-i, --input <path>", "入力Markdownファイル")
    .action(async (options) => {
      const markdown = await readTextFile(options.input);
      const treeBlock = extractTreeBlock(markdown);
      const rootNodes = parseTreeLines(treeBlock);
      const paths = flattenTreePaths(rootNodes);

      paths.forEach((entry) => {
        logger.plain(`${entry.type.padEnd(9)} ${entry.path}`);
      });
    });
}
