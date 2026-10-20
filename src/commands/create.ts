import path from "node:path";
import { Command } from "commander";
import { loadInput } from "../parser/input.js";
import { addInputOptions } from "./inputOptions.js";
import { logger } from "../infra/logger.js";
import { createStructure } from "../generator/createStructure.js";

export function registerCreateCommand(program: Command): void {
  addInputOptions(program
    .command("create")
    .description("Markdownから実際にフォルダ・ファイルを生成する")
    .requiredOption("-i, --input <path>", "入力 CSV / Markdown ファイル"))
    .option("-o, --output <path>", "出力先ディレクトリ", ".")
    .option("--dry-run", "実際には作成せず予定だけ表示する", false)
    .option("--force", "既存ファイルを上書きする", false)
    .option("--skip-existing", "既存ファイルをスキップする", false)
    .option("--template-dir <path>", "テンプレートディレクトリ")
    .action(async (options) => {
      if (options.force && options.skipExisting) throw new Error("--force と --skip-existing は同時指定できません");
      const rootNodes = await loadInput(options.input, options);

      const outputRoot = path.resolve(options.output);
      const templateDir = options.templateDir ? path.resolve(options.templateDir) : undefined;

      const overwriteMode = options.force ? "force" : options.skipExisting ? "skip" : "error";

      const result = await createStructure(rootNodes, {
        outputRoot,
        dryRun: Boolean(options.dryRun),
        overwriteMode,
        templateDir
      });

      logger.info(`directories: ${result.createdDirectories}`);
      logger.info(`files: ${result.createdFiles}`);
      logger.info(`skipped: ${result.skippedFiles}`);
      if (options.dryRun) {
        logger.info("dry-runのため実ファイルは作成していません");
      }
    });
}
