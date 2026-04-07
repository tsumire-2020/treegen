import path from "node:path";
import { Command } from "commander";
import { readTextFile } from "../infra/fileSystem.js";
import { logger } from "../infra/logger.js";
import { extractTreeBlock } from "../parser/extractTreeBlock.js";
import { parseTreeLines } from "../parser/parseTreeLines.js";
import { validateTree } from "../domain/validateTree.js";
import { createStructure } from "../generator/createStructure.js";

export function registerCreateCommand(program: Command): void {
  program
    .command("create")
    .description("Markdownから実際にフォルダ・ファイルを生成する")
    .requiredOption("-i, --input <path>", "入力Markdownファイル")
    .option("-o, --output <path>", "出力先ディレクトリ", ".")
    .option("--dry-run", "実際には作成せず予定だけ表示する", false)
    .option("--force", "既存ファイルを上書きする", false)
    .option("--skip-existing", "既存ファイルをスキップする", false)
    .option("--template-dir <path>", "テンプレートディレクトリ")
    .action(async (options) => {
      const markdown = await readTextFile(options.input);
      const treeBlock = extractTreeBlock(markdown);
      const rootNodes = parseTreeLines(treeBlock);
      validateTree(rootNodes);

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
