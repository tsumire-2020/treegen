import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

export async function readTextFile(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error(`${JSON.stringify(filePath)} [INVALID_UTF8]: UTF-8 として読み取れません`);
  }
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, "utf-8");
}

export async function makeDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
