import { describe, expect, it } from "vitest";
import { validateTree } from "../../../src/domain/validateTree.js";

describe("validateTree", () => {
  it("正常なツリーを受け付ける", () => {
    expect(() =>
      validateTree([
        {
          name: "root",
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
      ])
    ).not.toThrow();
  });
});
