import path from "node:path";
import { createOptionsSchema } from "../domain/schema.js";
import { TreeNode } from "../domain/tree-node.js";
import { ensureSafePath } from "./ensureSafePath.js";
import { fileExists, makeDirectory, writeTextFile } from "../infra/fileSystem.js";
import { resolveTemplateContent } from "./templateResolver.js";

export type CreateStructureOptions = {
  outputRoot: string;
  dryRun: boolean;
  overwriteMode: "error" | "skip" | "force";
  templateDir?: string;
};

export type CreateStructureResult = {
  createdDirectories: number;
  createdFiles: number;
  skippedFiles: number;
};

export async function createStructure(
  rootNodes: TreeNode[],
  options: CreateStructureOptions
): Promise<CreateStructureResult> {
  createOptionsSchema.parse(options);

  if (!options.dryRun) {
    await makeDirectory(options.outputRoot);
  }

  const result: CreateStructureResult = {
    createdDirectories: 0,
    createdFiles: 0,
    skippedFiles: 0
  };

  for (const node of rootNodes) {
    await createNode(node, options.outputRoot, options, result);
  }

  return result;
}

async function createNode(
  node: TreeNode,
  parentDir: string,
  options: CreateStructureOptions,
  result: CreateStructureResult
): Promise<void> {
  const targetPath = ensureSafePath(options.outputRoot, path.join(parentDir, node.name));

  if (node.type === "directory") {
    if (!options.dryRun) {
      await makeDirectory(targetPath);
    }
    result.createdDirectories += 1;

    for (const child of node.children) {
      await createNode(child, targetPath, options, result);
    }

    return;
  }

  const exists = await fileExists(targetPath);
  if (exists) {
    if (options.overwriteMode === "skip") {
      result.skippedFiles += 1;
      return;
    }

    if (options.overwriteMode === "error") {
      throw new Error(`既存ファイルと衝突しました: ${targetPath}`);
    }
  }

  const templateContent = await resolveTemplateContent(node.name, options.templateDir);

  if (!options.dryRun) {
    await writeTextFile(targetPath, templateContent);
  }

  result.createdFiles += 1;
}
