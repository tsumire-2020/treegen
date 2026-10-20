import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureSafePath } from '../../../src/generator/ensureSafePath.js';
describe('lexical output containment', () => {
  it('accepts descendants of filesystem roots as well as normal output directories', () => {
    const root = path.parse(path.resolve('.')).root;
    expect(ensureSafePath(root, path.join(root, 'treegen-child'))).toBe(path.join(root, 'treegen-child'));
    expect(ensureSafePath('/tmp/out', '/tmp/out/a')).toBe(path.resolve('/tmp/out/a'));
  });
  it('rejects sibling prefix confusion and traversal outside output', () => {
    expect(() => ensureSafePath('/tmp/out', '/tmp/outside/a')).toThrow();
    expect(() => ensureSafePath('/tmp/out', '/tmp/out/../a')).toThrow();
  });
});
