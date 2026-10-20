import { describe, expect, it } from 'vitest';
import { parseInput } from '../../../src/parser/input.js';
import { assembleRows, parseCsv, tableCells } from '../../../src/parser/rows.js';
import { InputError } from '../../../src/utils/errors.js';
import { readTextFile } from '../../../src/infra/fileSystem.js';
import { flattenTreePaths } from '../../../src/utils/path.js';
import { parseTreeLines } from '../../../src/parser/parseTreeLines.js';
const csv = (rows: string) => `id,parent_id,name,type\n${rows}`;
const md = (body: string) => `# title\n\n\`\`\`tree\n${body}\n\`\`\``;
function diagnostics(fn: () => unknown) {
  try { fn(); throw new Error('expected InputError'); } catch (e) { expect(e).toBeInstanceOf(InputError); return (e as InputError).diagnostics; }
}
describe('adopted row/tree design', () => {
  it('all six public samples produce the same ordered hierarchy', async () => {
    const expected = [
      { type: 'directory', path: 'project' }, { type: 'directory', path: 'project/src' },
      { type: 'file', path: 'project/src/index.ts' }, { type: 'file', path: 'project/README.md' }
    ];
    for (const file of ['id.csv', 'path.csv', 'id-table.md', 'path-table.md', 'branches.md', 'indent.md']) {
      expect(flattenTreePaths(parseInput(await readTextFile(`examples/${file}`), file))).toEqual(expected);
    }
  });
  it('resolves later parents and preserves sibling and root input order, string IDs', () => {
    const nodes = parseInput(csv('i,s,index.ts,file\nr,p,README.md,file\ns,p,src,directory\np,,project,directory\n001,,zero,file\n1,,one,file'), 'x.csv');
    expect(nodes.map(n => n.name)).toEqual(['project', 'zero', 'one']);
    expect(nodes[0].children.map(n => n.name)).toEqual(['README.md', 'src']);
  });
  it('preserves CSV whitespace, trims only headers, ignores extra columns', () => {
    const nodes = parseInput(' id , parent_id ,name,type,extra\n a ,, padded ,file,**ignored**', 'x.csv');
    expect(nodes[0].name).toBe(' padded ');
    expect(parseInput('id,parent_id,name,type\nx_y,,snake_case,file', 'x.csv')[0].name).toBe('snake_case');
    expect(parseInput('| parent_path | name | type | note |\n|:---|---:|:---:|---|\n| | snake_case | file | **ignored** |', 'x.md')[0].name).toBe('snake_case');
  });
  it('CSV handles BOM, CRLF, quotes, commas, empty physical lines and multiline ranges', () => {
    const rows = parseCsv('\uFEFFid,parent_id,name,type,note\r\n\r\nx,,"comma,name",file,"a""b\r\nc"', 'x.csv');
    expect(rows[1][2].value).toBe('comma,name');
    expect(rows[1][4].value).toBe('a"b\nc');
    expect(rows[1][4].source).toMatchObject({ line: 3, endLine: 4, record: 1 });
    expect(assembleRows(rows)[0].name).toBe('comma,name');
  });
  it('uses codepoint columns and source ranges, escapes control values', () => {
    const errors = diagnostics(() => parseInput(csv('😀,,"bad\nname",file'), 'x.csv'));
    expect(errors[0]).toMatchObject({ code: 'INVALID_NAME', source: { line: 2, column: 4, endLine: 3, endColumn: 6, record: 1 } });
    try { parseInput(csv('😀,,"bad\nname",file'), 'x.csv'); } catch (e) { expect(String(e)).toContain('bad\\nname'); }
    const nodes = parseInput('# intro\n\n| parent_path | name | type |\n|---|---|---|\n| | 😀 | file |', 'x.md');
    expect(nodes[0].source).toMatchObject({ line: 5, column: 5, endColumn: 6, target: 'table:1' });
  });
  it.each([
    ['a,,a,file\na,,b,file', 'DUPLICATE_ID'], ['a,missing,a,file', 'PARENT_NOT_FOUND'],
    ['a,a,a,directory', 'CYCLE'], ['a,b,a,directory\nb,a,b,directory\nc,c,c,directory', 'CYCLE'],
    ['a,,a,file\nb,a,b,file', 'FILE_HAS_CHILD'], ['a,,x,file\nb,,X,directory', 'OUTPUT_COLLISION'],
    ['a,,x,file\nb,,x,file', 'OUTPUT_COLLISION'], ['a,,x,file\nb,,x,directory', 'OUTPUT_COLLISION'],
    ['a,,x,dir', 'INVALID_TYPE'], [',,x,file', 'INVALID_ID'], ['a,, ,file', 'INVALID_NAME'],
    ['a, ,x,file', 'UNSAFE_PATH'], ['a,,../x,file', 'INVALID_NAME'], ['a,,x/,directory', 'INVALID_NAME'],
    ['a,,x\\y,file', 'INVALID_NAME'], ['a,,x\u001b,file', 'INVALID_NAME'], ['a,,x,FILE', 'INVALID_TYPE']
  ])('rejects row error %s', (row, code) => {
    expect(diagnostics(() => parseInput(csv(row), 'x.csv')).some(e => e.code === code)).toBe(true);
  });
  it('aggregates independent semantic errors and supplies related locations', () => {
    const errors = diagnostics(() => parseInput(csv('x,missing,,dir\nx,,good,file'), 'x.csv'));
    expect(errors.map(e => e.code)).toEqual(expect.arrayContaining(['INVALID_NAME', 'INVALID_TYPE', 'DUPLICATE_ID', 'PARENT_NOT_FOUND']));
    expect(errors.find(e => e.code === 'DUPLICATE_ID')?.related?.[0].line).toBe(2);
    const cycles = diagnostics(() => parseInput(csv('a,b,a,directory\nb,a,b,directory\nc,c,c,directory'), 'x.csv')).filter(e => e.code === 'CYCLE');
    expect(cycles).toHaveLength(2);
    expect(cycles[0].related).toHaveLength(4);
  });
  it.each(['/tmp', 'C:\\x', 'a/../b', '/a', 'a/', 'a//b', '.', 'a/./b'])('rejects unsafe parent path %s', parent => {
    expect(diagnostics(() => parseInput(`parent_path,name,type\n${parent},child,file`, 'x.csv')).some(e => e.code === 'UNSAFE_PATH')).toBe(true);
  });
  it('requires explicit ancestors, rejects path file parents', () => {
    expect(() => parseInput('parent_path,name,type\nproject/src,index.ts,file', 'x.csv')).toThrow(/PARENT_NOT_FOUND/);
    expect(() => parseInput('parent_path,name,type\n,a,file\na,b,file', 'x.csv')).toThrow(/FILE_HAS_CHILD/);
  });
  it.each([
    ['id,parent_id,name,type,parent_path\na,,x,file,', 'MIXED_MODE'],
    ['id,name,type\na,x,file', 'MISSING_HEADER'], ['name,type\nx,file', 'MISSING_HEADER'],
    ['ID,parent_id,name,type\na,,x,file', 'MISSING_HEADER'], ['id,parent_id,name,name,type', 'DUPLICATE_HEADER'],
    ['id,parent_id,name,type\na,,x', 'COLUMN_COUNT'], ['id,parent_id,name,type\n,,,', 'INVALID_ID'],
    ['id,parent_id,name,type\na,,"x,file', 'CSV_SYNTAX'], ['id,parent_id,name,type\na,,x"y,file', 'CSV_SYNTAX'],
    ['id,parent_id,name,type\na,,"x" ,file', 'CSV_SYNTAX']
  ])('rejects header / CSV syntax: %s', (text, code) => expect(() => parseInput(text, 'x.csv')).toThrow(code));
  it('splits table escapes and code pipes before interpreting decoration', () => {
    expect(tableCells('| a\\|b | `c|d` | e\\\\f |', 'x.md', 1).map(c => c.value)).toEqual(['a|b', '`c|d`', 'e\\f']);
    for (const value of ['**bold**', '_italic_', '[label](url)', '<b>x</b>', '&amp;', '`a|b`']) {
      expect(() => parseInput(`parent_path | name | type\n---|---|---\n| | ${value} | file`, 'x.md')).toThrow(/CELL_DECORATION/);
    }
    expect(() => parseInput('parent_path|name|type\n---|---|---\n|x|file', 'x.md')).toThrow(/COLUMN_COUNT/);
    expect(() => parseInput('parent_path|name|type\n---|---|---\n||x\\|y|file', 'x.md')).toThrow(/INVALID_NAME/);
  });
  it.each([
    ['root/\n└── a\n└── b', 'TREE_CONNECTOR'], ['root/\n├── a', 'TREE_CONNECTOR'],
    ['root/\n├── a/\n    └── x\n└── b', 'TREE_CONTINUATION'],
    ['root/\n└── a/\n│   └── x', 'TREE_CONTINUATION'], ['└── a', 'TREE_DEPTH'],
    ['root/\n  a\n└── b', 'TREE_CONNECTOR'], ['root/\n├─ a', 'TREE_CONNECTOR'], ['root/\n  ├── a', 'TREE_CONNECTOR'],
    ['root/\n\ta', 'TREE_SYNTAX'], ['root/\n2 directories, 2 files', 'TREE_SYNTAX'],
    ['root/\n└── src\n    └── a', 'FILE_HAS_CHILD'], ['.\n└── x', 'INVALID_NAME']
  ])('rejects malformed tree %s', (body, code) => expect(() => parseInput(md(body), 'x.md')).toThrow(code));
  it('supports real multiple roots and keeps blank-line source positions', () => {
    expect(parseInput(md('a/\n└── x\nb/\n└── y'), 'x.md').map(n => n.name)).toEqual(['a', 'b']);
    expect(parseTreeLines('root/\n\n  x')[0].children[0].source?.line).toBe(3);
    expect(parseInput(md('├── literal'), 'x.md', { treeStyle: 'indent' })[0].name).toBe('├── literal');
    expect(() => parseInput(md('root/\n  x'), 'x.md', { treeStyle: 'branches' })).toThrow(/TREE_CONNECTOR/);
  });
  it('selects only the chosen top-level candidate, numbers per kind', () => {
    const table = 'parent_path|name|type\n---|---|---\n||table|file';
    const text = [md('first'), table, md('../bad'), table.replace('table|', 'second|')].join('\n\n');
    expect(parseInput(text, 'x.md')[0].name).toBe('first');
    expect(parseInput(text, 'x.md', { source: 'table:2' })[0].name).toBe('second');
    expect(() => parseInput(text, 'x.md', { source: 'tree:2' })).toThrow(/INVALID_NAME/);
    expect(() => parseInput(`${table}\n\n${table}`, 'x.md')).toThrow(/AMBIGUOUS_SOURCE.*table:1 line 1.*table:2 line 5/);
    expect(() => parseInput(text, 'x.md', { source: 'tree:3' })).toThrow(/SOURCE_NOT_FOUND/);
    expect(() => parseInput(text, 'x.md', { source: 'table:0' })).toThrow(/INVALID_SOURCE/);
  });
  it('ignores ordinary fences, quoted and list examples, unrelated tables', () => {
    const text = ['````md', md('wrong'), '````', '> ```tree', '> quoted', '> ```', '- example', '  ```tree', '  listed', '  ```', 'a|b', '---|---', 'x|y', md('right')].join('\n');
    expect(parseInput(text, 'x.md')[0].name).toBe('right');
    expect(() => parseInput('id|name\n---|---\na|x', 'x.md')).toThrow(/MISSING_HEADER/);
    expect(() => parseInput('nothing', 'x.md')).toThrow(/NO_TARGET/);
    expect(() => parseInput('```tree\nx', 'x.md')).toThrow(/UNCLOSED_FENCE/);
    expect(() => parseInput(`${md('root/\n    bad')}\n${md('good')}`, 'x.md')).toThrow(/TREE_DEPTH/);
  });
  it('extension and explicit options never cause fallback', () => {
    expect(parseInput(csv('x,,file,file'), 'X.CSV')[0].name).toBe('file');
    expect(parseInput(csv('x,,file,file'), 'x.txt', { inputFormat: 'csv' })[0].name).toBe('file');
    expect(() => parseInput(csv('x,,file,file'), 'x.txt')).toThrow(/UNKNOWN_FORMAT/);
    expect(() => parseInput(md('file'), 'x.csv')).toThrow(/MISSING_HEADER/);
    for (const options of [{ source: 'tree:1' }, { treeStyle: 'auto' as const }]) expect(() => parseInput(csv('x,,file,file'), 'x.csv', options)).toThrow(/INCOMPATIBLE_OPTION/);
    expect(() => parseInput('parent_path|name|type\n---|---|---\n|x|file', 'x.md', { treeStyle: 'auto' })).toThrow(/INCOMPATIBLE_OPTION/);
  });
});

describe('Markdown container boundaries and original positions', () => {
  it('accepts top-level fences with up to three spaces and keeps original columns', () => {
    const nodes = parseInput('   ~~~tree\n   root/\n     x\n   ~~~', 'x.md');
    expect(nodes[0].children[0].name).toBe('x');
    expect(nodes[0].source).toMatchObject({ line: 2, column: 4, endColumn: 9 });
    expect(nodes[0].children[0].source).toMatchObject({ line: 3, column: 4, endColumn: 7 });
  });
  it('excludes nested list fences and tables but accepts later top-level indentation', () => {
    const text = '- example\n\n  ```tree\n  bad\n  ```\n\n  parent_path|name|type\n  ---|---|---\n  ||bad|file\n\n   ```tree\n   good\n   ```';
    // Three spaces still continues this list; an actual top-level construct
    // follows a dedented block and may itself have Markdown indentation.
    const fixed = text + '\n\n# outside\n\n   ```tree\n   right\n   ```';
    expect(parseInput(fixed, 'x.md')[0].name).toBe('right');
  });
  it('ignores HTML comments and raw HTML examples', () => {
    const text = '<!--\n```tree\nwrong\n```\n-->\n<pre>\n```tree\nwrong\n```\n</pre>\n\n```tree\nright\n```';
    expect(parseInput(text, 'x.md')[0].name).toBe('right');
  });
  it('rejects trailing tabs and missing table cells instead of silently omitting them', () => {
    expect(() => parseInput('```tree\nroot/\n  x\t\n```', 'x.md')).toThrow(/TREE_SYNTAX/);
    expect(() => parseInput('parent_path|name|type\n---|---|---\nx', 'x.md')).toThrow(/COLUMN_COUNT/);
    expect(() => parseInput('parent_path|name|type\n---|---\n||x|file', 'x.md')).toThrow(/TABLE_SYNTAX/);
  });
});

describe('remaining design edge cases', () => {
  it('keeps a later BOM and distinguishes an empty record from an empty physical line', () => {
    const rows = parseCsv('\uFEFFid,parent_id,name,type\n\nx,,\uFEFFfile,file\n,,,');
    expect(rows[1][2].value).toBe('\uFEFFfile');
    expect(rows[2][0].source.record).toBe(2);
    expect(() => assembleRows(rows)).toThrow(/INVALID_ID/);
  });
  it('preserves empty directories and extensionless files without inference', () => {
    const nodes = parseInput(csv('a,,empty,directory\nb,,LICENSE,file'), 'x.csv');
    expect(nodes.map(n => n.type)).toEqual(['directory', 'file']);
    expect(nodes[0].children).toEqual([]);
  });
  it('does not normalize parent references, whitespace, or special root labels', () => {
    expect(() => parseInput(csv(' p ,,parent,directory\nc,p,child,file'), 'x.csv')).toThrow(/PARENT_NOT_FOUND/);
    expect(() => parseInput(csv('a,NULL,child,file'), 'x.csv')).toThrow(/PARENT_NOT_FOUND/);
    expect(parseInput(csv('NULL,,parent,directory\nc,NULL,child,file'), 'x.csv')[0].children[0].name).toBe('child');
  });
  it('supports reordered required columns and unframed aligned tables', () => {
    const nodes = parseInput('type | name | parent_path\n:--- | ---: | :---:\ndirectory | root ||\nfile | child | root', 'x.markdown');
    expect(nodes[0].children[0].name).toBe('child');
  });
  it('does not parse unselected broken table data, and errors on selected syntax', () => {
    const text = '```tree\ngood\n```\n\nparent_path|name|type\n---|---|---\n||`unclosed|file';
    expect(parseInput(text, 'x.md')[0].name).toBe('good');
    expect(() => parseInput(text, 'x.md', { source: 'table:1' })).toThrow(/TABLE_SYNTAX/);
  });
  it('keeps non-ASCII names without Unicode normalization', () => {
    const nodes = parseInput(csv('a,,é,file\nb,,é,file'), 'x.csv');
    expect(nodes).toHaveLength(2);
  });
  it('does not emit controls contained in diagnostic fields, values, filenames or cycle paths', () => {
    const error = new InputError([{ code: 'TEST', message: 'bad\u001b\n', field: 'field\u001b', value: 'value\u001b\n', source: { file: 'x\u001b', line: 1, column: 1, endLine: 1, endColumn: 2 } }]);
    expect(error.message).not.toMatch(/[\x00-\x1f\x7f-\x9f]/);
    expect(error.message).toContain('\\u001b');
  });
});


describe('table first-column inline syntax', () => {
  it('does not truncate a selected table when a later row begins with a code span', () => {
    const text = 'id|parent_id|name|type\n---|---|---|---\np||parent|directory\n`child`|p|child|file';
    expect(() => parseInput(text, 'x.md')).toThrow(/CELL_DECORATION/);
  });
});
