export type SourceRange = {
  file: string;
  target?: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  record?: number;
};
export type Diagnostic = {
  code: string;
  file?: string;
  message: string;
  source?: SourceRange;
  field?: string;
  value?: string;
  related?: SourceRange[];
};
export function quote(value: string): string {
  return JSON.stringify(value).replace(/[\u007f-\u009f]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
function safeText(value: string): string {
  return value.replace(/[\x00-\x1f\x7f-\x9f]/g, c => quote(c).slice(1, -1));
}
function location(s: SourceRange): string {
  const end = s.endLine !== s.line || s.endColumn !== s.column ? `-${s.endLine}:${s.endColumn}` : '';
  return `${safeText(s.file)}:${s.line}:${s.column}${end}${s.target ? ` (${s.target})` : ''}`;
}
export class InputError extends Error {
  constructor(public readonly diagnostics: Diagnostic[]) {
    super(diagnostics.map(d => `${d.source ? location(d.source) : d.file ? safeText(d.file) : 'input'} [${d.code}] ${safeText(d.field ?? 'value')}=${quote(d.value ?? '')}: ${safeText(d.message)}${d.source?.record ? ` (data record ${d.source.record})` : ''}${(d.related ?? []).map(s => `\n  related ${location(s)}`).join('')}`).join('\n'));
    this.name = 'InputError';
  }
}
export function fail(code: string, message: string, source?: SourceRange, value?: string): never {
  throw new InputError([{ code, message, source, value }]);
}
export function range(file: string, line: number, column: number, endColumn = column, target?: string): SourceRange {
  return { file, line, column, endLine: line, endColumn, target };
}
