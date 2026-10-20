import path from "node:path";

export function ensureSafePath(outputRoot: string, targetPath: string): string {
  const normalizedRoot = path.resolve(outputRoot);
  const normalizedTarget = path.resolve(targetPath);

  const relative = path.relative(normalizedRoot, normalizedTarget);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`出力先ルートの外へ出るパスは許可されていません: ${targetPath}`);
  }

  return normalizedTarget;
}
