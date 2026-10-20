import { Command } from "commander";
import { loadInput } from "../parser/input.js";
import { addInputOptions } from "./inputOptions.js";
import { logger } from "../infra/logger.js";
import { flattenTreePaths } from "../utils/path.js";

export function registerPreviewCommand(program: Command): void {
  addInputOptions(program
    .command("preview")
    .description("生成予定のパス一覧を表示する")
    .requiredOption("-i, --input <path>", "入力 CSV / Markdown ファイル"))
    .action(async (options) => {
      const rootNodes = await loadInput(options.input, options);
      const paths = flattenTreePaths(rootNodes);

      paths.forEach((entry) => {
        logger.plain(`${entry.type.padEnd(9)} ${entry.path}`);
      });
    });
}
