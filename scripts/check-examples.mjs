#!/usr/bin/env node
/**
 * check-examples.mjs
 *
 * Verifies that every TypeScript code snippet embedded in readme.md and
 * src/SKILL.md is mirrored exactly by a file in examples/.
 *
 * Contract:
 * - Each ` ```typescript ` fence in a registered doc must be preceded (within
 *   one blank line) by a sentinel comment: `<!-- example: <id> -->`. The
 *   `<id>` is the semantic id of the example, equal to the example file name
 *   without the `.ts` extension.
 * - Each file in examples/ must carry a `// @docs: <doc>[, <doc>...]` header
 *   listing the docs the example is embedded in, plus exactly one snippet
 *   region delimited by `// @snippet-start` and `// @snippet-end`. The region
 *   text must match the corresponding doc fence body byte-for-byte (after
 *   normalizing line endings and trailing whitespace).
 * - Examples under examples/illustrative/ are intentionally non-compiling and
 *   must be marked `// @no-compile`; they are still text-checked here.
 *
 * Every finding is a hard error; the script exits 1 if any are reported.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const DOCS = ['readme.md', 'src/SKILL.md'];
const EXAMPLES_DIR = 'examples';
const SENTINEL_RE = /^<!--\s*example:\s*([a-z0-9-]+)\s*-->\s*$/;

const errors = [];
const counts = { tsFences: 0, otherFences: 0, examples: 0 };

function err(file, line, code, msg) {
  errors.push({ file, line, code, msg });
}

function norm(s) {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/, '');
}

function findTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findTsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

function parseDoc(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const fences = [];
  let open = false;
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^```\s*(\S*)/);
    if (m) {
      if (open) {
        cur.body = cur.lines.join('\n');
        fences.push(cur);
        open = false;
        cur = null;
      } else {
        open = true;
        cur = { lang: m[1] || '', startLine: i + 1, lines: [] };
      }
    } else if (open) {
      cur.lines.push(lines[i]);
    }
  }
  if (open) {
    err(file, cur.startLine, 'UNBALANCED_FENCE', `fence opened at line ${cur.startLine} (lang "${cur.lang}") is never closed`);
  }
  return { fences, lines };
}

function findSentinelAbove(lines, idx) {
  let cursor = idx - 1;
  let blanks = 0;
  while (cursor >= 0) {
    if (lines[cursor].trim() === '') {
      blanks++;
      cursor--;
      continue;
    }
    const m = lines[cursor].match(SENTINEL_RE);
    if (m && blanks <= 1) return { id: m[1], lineNo: cursor + 1 };
    return null;
  }
  return null;
}

// ---- parse docs ----
const docResults = {};
for (const doc of DOCS) {
  let parsed;
  try {
    parsed = parseDoc(doc);
  } catch (e) {
    err(doc, 1, 'BAD_METADATA', `cannot read doc: ${e.message}`);
    continue;
  }
  const { fences, lines } = parsed;
  const sentinels = new Map();
  lines.forEach((line, i) => {
    const m = line.match(SENTINEL_RE);
    if (m) sentinels.set(i + 1, m[1]);
  });
  const used = new Set();
  for (const f of fences) {
    if (f.lang === 'typescript') {
      counts.tsFences++;
      const sid = findSentinelAbove(lines, f.startLine - 1);
      if (!sid) {
        err(doc, f.startLine, 'FENCE_NO_SENTINEL', `typescript fence at line ${f.startLine} has no '<!-- example: <id> -->' sentinel above it`);
      } else {
        used.add(sid.lineNo);
        f.id = sid.id;
        f.sentinelLine = sid.lineNo;
      }
    } else {
      counts.otherFences++;
    }
  }
  sentinels.forEach((id, lineNo) => {
    if (!used.has(lineNo)) {
      err(doc, lineNo, 'SENTINEL_NO_FENCE', `sentinel '<!-- example: ${id} -->' at line ${lineNo} is not followed by a typescript fence`);
    }
  });
  const seen = new Map();
  for (const f of fences) {
    if (!f.id) continue;
    if (seen.has(f.id)) err(doc, f.startLine, 'DUP_ID', `sentinel id "${f.id}" used at lines ${seen.get(f.id)} and ${f.startLine}`);
    else seen.set(f.id, f.startLine);
  }
  docResults[doc] = fences.filter((f) => f.id);
}

// ---- parse examples ----
const exampleInfo = new Map();
const exampleFiles = findTsFiles(EXAMPLES_DIR);
counts.examples = exampleFiles.length;
for (const file of exampleFiles) {
  const id = basename(file, '.ts');
  const lines = readFileSync(file, 'utf8').split('\n');
  let docs = null;
  let noCompile = false;
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const dm = lines[i].match(/\/\/\s*@docs:\s*(.+?)\s*$/);
    if (dm) docs = dm[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (/\/\/\s*@no-compile\s*$/.test(lines[i])) noCompile = true;
    if (/\/\/\s*@snippet-start\s*$/.test(lines[i])) {
      if (startIdx !== -1) err(file, i + 1, 'MULTI_REGION', 'multiple @snippet-start markers');
      startIdx = i;
    }
    if (/\/\/\s*@snippet-end\s*$/.test(lines[i])) endIdx = i;
  }
  if (startIdx === -1 || endIdx === -1) {
    err(file, 1, 'NO_REGION', 'example missing @snippet-start/@snippet-end region markers');
  } else if (startIdx > endIdx) {
    err(file, startIdx + 1, 'NO_REGION', '@snippet-start appears after @snippet-end');
  } else if (endIdx - startIdx <= 1) {
    err(file, startIdx + 1, 'EMPTY_REGION', 'snippet region is empty');
  }
  if (!docs || docs.length === 0) err(file, 1, 'NO_METADATA', 'example missing a "// @docs:" registered-locations header');
  const illustrative = file.includes(`/${'illustrative'}/`) || file.startsWith(`examples${'illustrative'}/`);
  if (illustrative && !noCompile) err(file, 1, 'ILLUSTRATIVE_MARKER', 'illustrative example must be marked "// @no-compile"');
  if (!illustrative && noCompile) err(file, 1, 'ILLUSTRATIVE_MARKER', 'non-illustrative example must not be marked "// @no-compile"');
  const region = lines.slice(startIdx + 1, endIdx).join('\n');
  exampleInfo.set(id, { file, docs: docs || [], region, regionStartLine: startIdx + 2, illustrative });
}

// ---- cross-reference: example metadata vs doc sentinels ----
for (const [id, ex] of exampleInfo) {
  for (const doc of ex.docs) {
    const list = docResults[doc];
    if (!list) {
      err(ex.file, 1, 'BAD_METADATA', `@docs references unknown doc "${doc}"`);
      continue;
    }
    if (!list.some((f) => f.id === id)) {
      err(ex.file, 1, 'MISSING_LOCATION', `"${id}" is registered for ${doc} but no '<!-- example: ${id} -->' sentinel exists in ${doc}`);
    }
  }
}
for (const doc of DOCS) {
  for (const f of docResults[doc] || []) {
    const ex = exampleInfo.get(f.id);
    if (!ex) {
      err(doc, f.sentinelLine, 'UNKNOWN_ID', `sentinel '<!-- example: ${f.id} -->' has no corresponding file ${EXAMPLES_DIR}/${f.id}.ts`);
      continue;
    }
    if (!ex.docs.includes(doc)) {
      err(doc, f.sentinelLine, 'UNEXPECTED_LOCATION', `"${f.id}" appears in ${doc} but its @docs metadata does not list ${doc}`);
    }
    const nb = norm(f.body);
    const nr = norm(ex.region);
    if (nb !== nr) {
      const a = nb.split('\n');
      const b = nr.split('\n');
      let di = 0;
      while (di < a.length && di < b.length && a[di] === b[di]) di++;
      err(doc, f.startLine, 'MISMATCH', `content in ${doc} (fence at line ${f.startLine}) does not match ${ex.file} (region from line ${ex.regionStartLine}); first difference at ${doc} line ${f.startLine + di + 1} vs ${ex.file} line ${ex.regionStartLine + di + 1}`);
    }
  }
}

// ---- report ----
const byCode = {};
for (const e of errors) {
  byCode[e.code] = (byCode[e.code] || 0) + 1;
  console.log(`${e.file}:${e.line} [${e.code}] ${e.msg}`);
}
console.log('\nsummary:');
console.log(`  docs scanned: ${DOCS.join(', ')}`);
console.log(`  typescript fences: ${counts.tsFences} (non-ts ignored: ${counts.otherFences})`);
console.log(`  example files: ${counts.examples}`);
console.log(`  errors: ${errors.length}`);
for (const [code, n] of Object.entries(byCode).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`    ${code}: ${n}`);
}
if (errors.length > 0) {
  console.error('\n[CHECK-EXAMPLES] errors found — fix before committing.');
  process.exit(1);
}
console.log('[CHECK-EXAMPLES] all examples match their registered doc locations.');