import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { analyzeExamples, printFindings } from '../scripts/check-examples.mjs';
import { syncExamples } from '../scripts/sync-examples.mjs';

const TEMP_ROOT = join(process.cwd(), 'temp', 'scripts-tests');

function exampleSrc(regionLines) {
  return ['// @docs: {{DOC}}', '// @snippet-start', ...regionLines, '// @snippet-end', ''].join('\n');
}

function docSrc(id, fenceLines) {
  return ['', '<!-- example: ' + id + ' -->', '```typescript', ...fenceLines, '```', ''].join('\n');
}

async function writeFixture({ doc = null, examples = {} }) {
  const dir = await mkdtemp(join(TEMP_ROOT, 'fx-'));
  const docPath = join(dir, 'readme.md');
  const examplesDir = join(dir, 'examples');
  await mkdir(examplesDir, { recursive: true });
  if (doc !== null) await writeFile(docPath, doc);
  for (const [name, content] of Object.entries(examples)) {
    await mkdir(dirname(join(examplesDir, name)), { recursive: true });
    await writeFile(join(examplesDir, name), content.replaceAll('{{DOC}}', docPath));
  }
  return { dir, docPath, examplesDir };
}

function analyze(fx) {
  return analyzeExamples({ docs: [fx.docPath], examplesDir: fx.examplesDir });
}

function sync(fx) {
  return syncExamples({ docs: [fx.docPath], examplesDir: fx.examplesDir });
}

describe('examples scripts (check/sync)', () => {
  beforeEach(async () => {
    await mkdir(TEMP_ROOT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEMP_ROOT, { recursive: true, force: true });
  });

  it('[C01] analyzeExamples reports MISMATCH and never writes', async () => {
    const fx = await writeFixture({
      doc: docSrc('foo', ['const x = 2;']),
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    const before = await readFile(fx.docPath);
    const { findings, mismatches } = analyze(fx);
    expect(mismatches).toHaveLength(1);
    expect(findings.map((f) => f.code)).toContain('MISMATCH');
    const after = await readFile(fx.docPath);
    expect(after.equals(before)).toBe(true);
  });

  it('[C02] syncExamples copies the canonical region over the drifted fence', async () => {
    const fx = await writeFixture({
      doc: docSrc('foo', ['const x = 2;']),
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    const { fixed, findings } = sync(fx);
    expect(fixed).toEqual([{ doc: fx.docPath, id: 'foo', line: 3 }]);
    expect(findings).toEqual([]);
    const doc = await readFile(fx.docPath, 'utf8');
    expect(doc).toContain('const x = 1;');
    expect(doc).not.toContain('const x = 2;');
    const re = analyze(fx);
    expect(re.findings).toEqual([]);
    expect(re.mismatches).toEqual([]);
  });

  it('[C03] syncExamples repairs multiple fences in one doc without corrupting layout', async () => {
    const doc = [
      '',
      '<!-- example: foo -->',
      '```typescript',
      'const foo = 0;',
      '```',
      '',
      '<!-- example: bar -->',
      '```typescript',
      'const bar = 0;',
      'const extra = 0;',
      '```',
      '',
    ].join('\n');
    const fx = await writeFixture({
      doc,
      examples: {
        'foo.ts': exampleSrc(['const foo = 1;']),
        'bar.ts': exampleSrc(['const bar = 1;']),
      },
    });
    const { fixed, findings } = sync(fx);
    expect(findings).toEqual([]);
    expect(fixed.map((f) => f.id).sort()).toEqual(['bar', 'foo']);
    const docAfter = await readFile(fx.docPath, 'utf8');
    expect(docAfter).toContain('const foo = 1;');
    expect(docAfter).toContain('const bar = 1;');
    expect(docAfter).not.toContain('const extra = 0;');
    expect(docAfter).not.toContain('const foo = 0;');
    const re = analyze(fx);
    expect(re.findings).toEqual([]);
  });

  it('[C04] structural violations are reported and never auto-fixed while drift is repaired', async () => {
    const doc = [
      '',
      '```typescript',
      'const rogue = 0;',
      '```',
      '',
      '<!-- example: foo -->',
      '```typescript',
      'const x = 2;',
      '```',
      '',
    ].join('\n');
    const fx = await writeFixture({
      doc,
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    const { fixed, findings } = sync(fx);
    expect(fixed).toEqual([{ doc: fx.docPath, id: 'foo', line: 7 }]);
    const codes = findings.map((f) => f.code);
    expect(codes).toContain('FENCE_NO_SENTINEL');
    expect(codes).not.toContain('MISMATCH');
    const docAfter = await readFile(fx.docPath, 'utf8');
    expect(docAfter).toContain('const x = 1;');
    expect(docAfter).toContain('const rogue = 0;');
  });

  it('[C05] examples with invalid regions are never used as a repair source', async () => {
    const bad = [
      '// @docs: {{DOC}}',
      '// @snippet-start',
      'const a = 1;',
      '// @snippet-start',
      'const b = 2;',
      '// @snippet-end',
      '',
    ].join('\n');
    const fx = await writeFixture({
      doc: docSrc('foo', ['const x = 2;']),
      examples: { 'foo.ts': bad },
    });
    const before = await readFile(fx.docPath);
    const { fixed, findings } = sync(fx);
    expect(fixed).toEqual([]);
    const codes = findings.map((f) => f.code);
    expect(codes).toContain('MULTI_REGION');
    expect(codes).toContain('MISMATCH');
    const after = await readFile(fx.docPath);
    expect(after.equals(before)).toBe(true);
  });

  it('[C06] clean fixtures produce no findings and no fixes', async () => {
    const fx = await writeFixture({
      doc: docSrc('foo', ['const x = 1;']),
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    const { fixed, findings, counts } = sync(fx);
    expect(fixed).toEqual([]);
    expect(findings).toEqual([]);
    expect(counts.examples).toBe(1);
    expect(counts.tsFences).toBe(1);
  });

  it('[C07] unclosed fences are detected', async () => {
    const doc = ['', '<!-- example: foo -->', '```typescript', 'const x = 1;', ''].join('\n');
    const fx = await writeFixture({
      doc,
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    const { findings } = analyze(fx);
    expect(findings.map((f) => f.code)).toContain('UNBALANCED_FENCE');
  });

  it('[C08] trailing whitespace and CRLF are normalized before comparison', async () => {
    const fxSpaces = await writeFixture({
      doc: docSrc('foo', ['const x = 1;   ']),
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    expect(analyze(fxSpaces).findings).toEqual([]);
    const fxCrlf = await writeFixture({
      doc: docSrc('foo', ['const x = 1;']).replace(/\n/g, '\r\n'),
      examples: { 'foo.ts': exampleSrc(['const x = 1;']) },
    });
    expect(analyze(fxCrlf).findings).toEqual([]);
  });

  it('[C09] modules are import-safe and expose the expected API', () => {
    expect(typeof analyzeExamples).toBe('function');
    expect(typeof printFindings).toBe('function');
    expect(typeof syncExamples).toBe('function');
    const out = execSync(
      'node --input-type=module -e "await import(\'./scripts/check-examples.mjs\'); await import(\'./scripts/sync-examples.mjs\')"',
      { encoding: 'utf8' },
    );
    expect(out).toBe('');
  });

  it('[C10] illustrative detection enforces the // @no-compile marker', async () => {
    const fx = await writeFixture({
      doc:
        docSrc('marked', ['const x: NotAType = 1;']) +
        docSrc('unmarked', ['const y: NotAType = 2;']) +
        docSrc('plain-marked', ['const z = 3;']),
      examples: {
        'illustrative/marked.ts':
          '// @no-compile\n' + exampleSrc(['const x: NotAType = 1;']),
        'illustrative/unmarked.ts': exampleSrc(['const y: NotAType = 2;']),
        'plain-marked.ts': '// @no-compile\n' + exampleSrc(['const z = 3;']),
      },
    });
    const { findings } = analyze(fx);
    const marker = findings.filter((f) => f.code === 'ILLUSTRATIVE_MARKER');
    expect(marker.map((f) => basename(f.file)).sort()).toEqual([
      'plain-marked.ts',
      'unmarked.ts',
    ]);
    expect(findings.filter((f) => f.code !== 'ILLUSTRATIVE_MARKER')).toEqual([]);
  });

  it('[C11] illustrative detection is path-segment based, not prefix based', async () => {
    const dir = await mkdtemp(join(TEMP_ROOT, 'seg-'));
    const examplesDir = join(dir, 'examplesillustrative');
    await mkdir(examplesDir, { recursive: true });
    await writeFile(join(dir, 'readme.md'), docSrc('plain', ['const a = 1;']));
    await writeFile(
      join(examplesDir, 'plain.ts'),
      exampleSrc(['const a = 1;']).replaceAll('{{DOC}}', 'readme.md'),
    );
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const { findings } = analyzeExamples({
        docs: ['readme.md'],
        examplesDir: 'examplesillustrative',
      });
      expect(findings).toEqual([]);
    } finally {
      process.chdir(cwd);
    }
  });
});
