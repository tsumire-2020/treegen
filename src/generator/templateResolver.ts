import path from "node:path";
import { fileExists, readTextFile } from "../infra/fileSystem.js";

const DEFAULT_TEMPLATE_MAP: Record<string, string> = {
  "handler.ts": "handler.ts.tpl",
  "schema.ts": "schema.ts.tpl",
  "README.md": "README.md.tpl"
};

export async function resolveTemplateContent(
  fileName: string,
  templateDir?: string
): Promise<string> {
  if (!templateDir) {
    return "";
  }

  const templateFile = DEFAULT_TEMPLATE_MAP[fileName];
  if (!templateFile) {
    return "";
  }

  const templatePath = path.join(templateDir, templateFile);
  const exists = await fileExists(templatePath);
  if (!exists) {
    return "";
  }

  return readTextFile(templatePath);
}
