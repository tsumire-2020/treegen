import { describe, expect, it } from "vitest";
import { parseTreeLines } from "../../../src/parser/parseTreeLines.js";

describe("parseTreeLines", () => {
  it("インデント付きtreeを構造化できる", () => {
    const block = [
      "root/",
      "  src/",
      "    index.ts",
      "  README.md"
    ].join("\n");

    const nodes = parseTreeLines(block);

    expect(nodes[0]?.name).toBe("root");
    expect(nodes[0]?.children[0]?.name).toBe("src");
    expect(nodes[0]?.children[0]?.children[0]?.name).toBe("index.ts");
  });

  it("インデントが飛び級になっている場合はエラーを投げる", () => {
    const block = ["root/", "    components/", "README.md"].join("\n");

    expect(() => parseTreeLines(block)).toThrowError(/インデントの階層が不正です/);
  });
});
