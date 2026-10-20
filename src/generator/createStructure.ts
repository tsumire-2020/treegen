import path from "node:path";
import { validateTree } from "../domain/validateTree.js";
import { InputError } from "../utils/errors.js";
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
  validateTree(rootNodes);
  const checkPaths = (nodes: TreeNode[], parent: string): void => {
    for (const node of nodes) {
      try {
        const target = ensureSafePath(options.outputRoot, path.join(parent, node.name));
        checkPaths(node.children, target);
      } catch (error) {
        if (error instanceof InputError) throw error;
        throw new InputError([{ code: "UNSAFE_PATH", message: String(error), source: node.source, value: node.name }]);
      }
    }
  };
  checkPaths(rootNodes, path.resolve(options.outputRoot));

  if (!options.dryRun) {
    try {
      await makeDirectory(options.outputRoot);
    } catch (error) {
      throw new InputError([{ code: "GENERATION_ERROR", message: error instanceof Error ? error.message : String(error), source: rootNodes[0]?.source, field: "output", value: options.outputRoot }]);
    }
  }

  const result: CreateStructureResult = {
    createdDirectories: 0,
    createdFiles: 0,
    skippedFiles: 0
  };

  for (const node of rootNodes) {
    await createNode(node, path.resolve(options.outputRoot), options, result);
  }

  return result;
}

async function createNode(
  node: TreeNode,
  parentDir: string,
  options: CreateStructureOptions,
  result: CreateStructureResult
): Promise<void> {
  try {
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
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError([{ code: "GENERATION_ERROR", message: error instanceof Error ? error.message : String(error), source: node.source, field: "path", value: path.relative(options.outputRoot, path.join(parentDir, node.name)) }]);
  }
}
