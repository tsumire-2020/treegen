import { describe, expect, it } from "vitest";
import { extractTreeBlock } from "../../../src/parser/extractTreeBlock.js";

describe("extractTreeBlock", () => {
  it("treeブロックを抽出できる", () => {
    const markdown = [
      "# title",
      "",
      "```tree",
      "root/",
      "  file.txt",
      "```"
    ].join("\n");

    expect(extractTreeBlock(markdown)).toContain("root/");
  });
});
