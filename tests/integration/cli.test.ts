import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runCli } from '../../src/cli/program.js';
const temporary: string[] = [];
async function sandbox() { const dir = await mkdtemp(path.join(os.tmpdir(), 'treegen-test-')); temporary.push(dir); return dir; }
afterEach(async () => { await Promise.all(temporary.splice(0).map(p => rm(p, { recursive: true, force: true }))); });
// Run the executable's entry function with real Commander parsing and real I/O.
// Keeping this in-process also works in sandboxes that restrict child process pipes.
async function cli(args: string[]): Promise<{ status: number; output: string }> {
  let output = '';
  const log = vi.spyOn(console, 'log').mockImplementation((...values) => { output += values.join(' ') + '\n'; });
  const error = vi.spyOn(console, 'error').mockImplementation((...values) => { output += values.join(' ') + '\n'; });
  try {
    return { status: await runCli(['node', 'treegen', ...args]), get output() { return output; } };
  } finally {
    log.mockRestore(); error.mockRestore();
  }
}

const samples = ['id.csv', 'path.csv', 'id-table.md', 'path-table.md', 'branches.md', 'indent.md'];
describe('CLI common pipeline and filesystem safety', () => {
  it.each(samples)('previews, validates, dry-runs and creates %s with template and overwrite modes', async file => {
    const dir = await sandbox(), output = path.join(dir, 'output');
    const args = ['--input', `examples/${file}`];
    if (file.includes('table')) args.push('--source', 'table:1');
    if (file === 'branches.md') args.push('--source', 'tree:1', '--tree-style', 'branches');
    const preview = await cli(['preview', ...args]);
    expect(preview.status, preview.output).toBe(0);
    expect(preview.output).toContain('project/src/index.ts');
    expect((await cli(['validate', ...args])).status).toBe(0);
    expect((await cli(['create', ...args, '--output', output, '--dry-run'])).status).toBe(0);
    await expect(access(output)).rejects.toThrow();
    const create = await cli(['create', ...args, '--output', output, '--template-dir', 'templates']);
    expect(create.status, create.output).toBe(0);
    expect(await readFile(path.join(output, 'project/README.md'), 'utf8')).toBe(await readFile('templates/README.md.tpl', 'utf8'));
    expect(await readFile(path.join(output, 'project/src/index.ts'), 'utf8')).toBe('');
    await writeFile(path.join(output, 'project/README.md'), 'keep');
    const collision = await cli(['create', ...args, '--output', output]);
    expect(collision.status).toBe(1); expect(collision.output).toMatch(/GENERATION_ERROR.*既存ファイル/);
    expect(collision.output).toMatch(/examples[/\\].*:\d+:\d+/);
    expect((await cli(['create', ...args, '--output', output, '--skip-existing'])).status).toBe(0);
    expect(await readFile(path.join(output, 'project/README.md'), 'utf8')).toBe('keep');
    expect((await cli(['create', ...args, '--output', output, '--force'])).status).toBe(0);
    expect(await readFile(path.join(output, 'project/README.md'), 'utf8')).toBe('');
  });
  it.each([
    ['bad.csv', 'id,parent_id,name,type\na,,ok,file\nb,,../escape,file', 'INVALID_NAME'],
    ['bad.md', '```tree\nroot/\n  ok\n  ../escape\n```', 'INVALID_NAME'],
    ['bad.csv', 'id,parent_id,name,type\na,,same,file\nb,,SAME,directory', 'OUTPUT_COLLISION'],
    ['bad.md', 'parent_path|name|type\n---|---|---\n||../escape|file', 'INVALID_NAME'],
    ['bad.md', 'parent_path|name|type\n---|---|---\n||ok|file\n||_bold_.txt|file', 'CELL_DECORATION'],
    ['bad.md', 'id|parent_id|name|type\n---|---|---|---\na||ok|file\npre**bold**post||child|file', 'CELL_DECORATION']
  ])('rejects %s consistently before any write', async (name, contents, code) => {
    const dir = await sandbox(), input = path.join(dir, name), output = path.join(dir, 'output');
    await writeFile(input, contents);
    for (const command of ['preview', 'validate', 'create']) {
      const result = await cli([command, '-i', input, ...(command === 'create' ? ['-o', output, '--dry-run'] : [])]);
      expect(result.status, result.output).toBe(1); expect(result.output).toContain(`[${code}]`);
    }
    expect((await cli(['create', '-i', input, '-o', output, '--force'])).status).toBe(1);
    await expect(access(output)).rejects.toThrow();
    await mkdir(output); await writeFile(path.join(output, 'ok'), 'original');
    expect((await cli(['create', '-i', input, '-o', output, '--force'])).status).toBe(1);
    expect(await readFile(path.join(output, 'ok'), 'utf8')).toBe('original');
  });
  it('rejects malformed UTF-8 and simultaneous overwrite flags without writes', async () => {
    const dir = await sandbox(), input = path.join(dir, 'bad.csv'), output = path.join(dir, 'output');
    await writeFile(input, Buffer.from([0x69, 0x64, 0x2c, 0xff]));
    expect((await cli(['validate', '-i', input])).output).toContain('INVALID_UTF8');
    const conflict = await cli(['create', '-i', 'examples/id.csv', '-o', output, '--force', '--skip-existing']);
    expect(conflict.status).toBe(1); expect(conflict.output).toContain('同時指定');
    await expect(access(output)).rejects.toThrow();
  });
  it('retains the original Markdown/CLI input', async () => {
    const result = await cli(['preview', '-i', 'example-structure.md']);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('handler.ts');
  });
});


describe('CLI selection after HTML examples', () => {
  it.each([undefined, 'tree:1'])('selects the top-level tree after a table and HTML attribute pipe with options %s', async source => {
    const dir = await sandbox(), input = path.join(dir, 'table-html.md');
    await writeFile(input, 'parent_path|name|type\n---|---|---\n||outside|file\n<blockquote title="a|b">\n```tree\nhidden\n```\n</blockquote>\n\n```tree\nright\n```');
    for (const command of ['preview', 'validate']) {
      const result = await cli([command, '-i', input, ...(source ? ['--source', source] : [])]);
      expect(result.status, result.output).toBe(0);
      expect(result.output).not.toContain('hidden');
      if (command === 'preview') {
        expect(result.output).toContain('right');
        expect(result.output).not.toContain('outside');
      }
    }
  });
  it.each([undefined, 'tree:1'])('selects the later top-level tree with options %s', async source => {
    const dir = await sandbox(), input = path.join(dir, 'html.md');
    await writeFile(input, '<BLOCKQUOTE class="example">\n```tree\nhidden\n```\nparent_path|name|type\n---|---|---\n||hidden|file\n</BLOCKQUOTE>\n\n```tree\nright\n```');
    const result = await cli(['preview', '-i', input, ...(source ? ['--source', source] : [])]);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('right');
    expect(result.output).not.toContain('hidden');
    expect((await cli(['validate', '-i', input, ...(source ? ['--source', source] : [])])).status).toBe(0);
  });
});
