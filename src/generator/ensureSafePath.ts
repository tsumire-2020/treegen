import path from "node:path";

export function ensureSafePath(outputRoot: string, targetPath: string): string {
  const normalizedRoot = path.resolve(outputRoot);
  const normalizedTarget = path.resolve(targetPath);

  if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`出力先ルートの外へ出るパスは許可されていません: ${targetPath}`);
  }

  return normalizedTarget;
}
