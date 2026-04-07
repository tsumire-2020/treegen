import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStructure } from "../../../src/generator/createStructure.js";
import { makeDirectory, writeTextFile, fileExists } from "../../../src/infra/fileSystem.js";
import { resolveTemplateContent } from "../../../src/generator/templateResolver.js";
import { TreeNode } from "../../../src/domain/tree-node.js";

vi.mock("../../../src/infra/fileSystem.js", () => ({
  makeDirectory: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  fileExists: vi.fn().mockResolvedValue(false),
  readTextFile: vi.fn()
}));

vi.mock("../../../src/generator/templateResolver.js", () => ({
  resolveTemplateContent: vi.fn().mockResolvedValue("")
}));

describe("createStructure", () => {
  const baseOptions = {
    outputRoot: path.resolve("tmp/output"),
    dryRun: false,
    overwriteMode: "error" as const,
    templateDir: undefined
  };

  const sampleTree: TreeNode[] = [
    {
      name: "project",
      type: "directory",
      depth: 0,
      children: [
        {
          name: "README.md",
          type: "file",
          depth: 1,
          children: []
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileExists).mockResolvedValue(false);
    vi.mocked(resolveTemplateContent).mockResolvedValue("// template");
  });

  it("指定したツリー構造に合わせてディレクトリとファイルを作成する", async () => {
    const result = await createStructure(sampleTree, baseOptions);

    expect(result).toEqual({
      createdDirectories: 1,
      createdFiles: 1,
      skippedFiles: 0
    });

    expect(makeDirectory).toHaveBeenCalledWith(baseOptions.outputRoot);
    expect(makeDirectory).toHaveBeenCalledWith(path.join(baseOptions.outputRoot, "project"));
    expect(writeTextFile).toHaveBeenCalledWith(
      path.join(baseOptions.outputRoot, "project", "README.md"),
      "// template"
    );
  });

  it("overwriteModeがskipのとき既存ファイルはスキップする", async () => {
    vi.mocked(fileExists).mockResolvedValue(true);

    const result = await createStructure(sampleTree, {
      ...baseOptions,
      overwriteMode: "skip"
    });

    expect(result.skippedFiles).toBe(1);
    expect(writeTextFile).not.toHaveBeenCalled();
    expect(resolveTemplateContent).not.toHaveBeenCalled();
  });

  it("dry-runの場合はファイルシステムを変更せず集計だけ行う", async () => {
    const result = await createStructure(sampleTree, {
      ...baseOptions,
      dryRun: true
    });

    expect(result.createdDirectories).toBe(1);
    expect(result.createdFiles).toBe(1);
    expect(makeDirectory).not.toHaveBeenCalled();
    expect(writeTextFile).not.toHaveBeenCalled();
  });
});
