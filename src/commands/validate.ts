import { Command } from "commander";
import { loadInput } from "../parser/input.js";
import { addInputOptions } from "./inputOptions.js";
import { logger } from "../infra/logger.js";

export function registerValidateCommand(program: Command): void {
  addInputOptions(program
    .command("validate")
    .description("Markdownのtree構造を検証する")
    .requiredOption("-i, --input <path>", "入力 CSV / Markdown ファイル"))
    .action(async (options) => {
      const rootNodes = await loadInput(options.input, options);
      logger.success("tree構造は有効です");
    });
}
