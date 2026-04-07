export function normalizeLine(line: string): string {
  // 将来的にタブ文字や全角スペースの扱いをここで吸収する
  // MVPでは末尾空白の削除だけ行う
  return line.replace(/\s+$/, "");
}
