import { selectTarget } from './markdown.js';
export function extractTreeBlock(markdown: string): string {
  const target = selectTarget(markdown, '<input>', 'tree:1');
  return target.text.split('\n').map(line => line.slice(Math.min(line.match(/^ */)![0].length, target.indent ?? 0))).join('\n').trimEnd();
}
