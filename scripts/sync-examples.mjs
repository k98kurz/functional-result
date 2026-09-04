#!/usr/bin/env node
/**
 * sync-examples.mjs
 *
 * Performs doc synchronization (direction: examples -> docs): for every
 * MISMATCH finding from the analysis in scripts/check-examples.mjs, copies
 * the canonical snippet region from examples/<id>.ts over the matching fence
 * in the registered docs. Structural contract violations are never
 * auto-fixed; they are reported and fail the run. Read-only verification:
 * node scripts/check-examples.mjs.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeExamples, printFindings } from './check-examples.mjs';

/**
 * Repairs MISMATCH findings on disk (the only writer in this pair of
 * scripts). Fences whose example region is structurally invalid
 * (regionValid === false) are skipped. After any repair, re-runs the
 * analysis from disk so the returned findings reflect the post-sync state.
 */
export function syncExamples(options = {}) {
  const before = analyzeExamples(options);
  const fixed = [];
  const fixesByDoc = new Map();
  for (const { doc, fence, example } of before.mismatches) {
    if (!example.regionValid) continue;
    const list = fixesByDoc.get(doc) || [];
    list.push({
      id: fence.id,
      bodyStartIdx: fence.startLine,
      count: fence.lines.length,
      newLines: example.regionLines,
      fenceLine: fence.startLine,
    });
    fixesByDoc.set(doc, list);
  }
  if (fixesByDoc.size === 0)
    return { counts: before.counts, findings: before.findings, fixed };
  for (const [doc, fixes] of fixesByDoc) {
    fixes.sort((a, b) => b.bodyStartIdx - a.bodyStartIdx);
    const lines = before.docLines[doc];
    for (const fx of fixes) {
      lines.splice(fx.bodyStartIdx, fx.count, ...fx.newLines);
      fixed.push({ doc, id: fx.id, line: fx.fenceLine });
    }
    writeFileSync(doc, lines.join('\n'));
  }
  const after = analyzeExamples(options);
  return { counts: after.counts, findings: after.findings, fixed };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { counts, findings, fixed } = syncExamples();
  for (const f of fixed) {
    console.log(
      `${f.doc}:${f.line} [FIXED] replaced fence for "${f.id}" with examples/${f.id}.ts snippet`
    );
  }
  if (fixed.length > 0) console.log('');
  printFindings(findings, counts);
  if (findings.length > 0) {
    console.error(
      '\n[SYNC-EXAMPLES] unfixable errors remain — manual attention required.'
    );
    process.exit(1);
  }
  console.log(
    `[SYNC-EXAMPLES] ${fixed.length} ${fixed.length === 1 ? 'fence' : 'fences'} synced; all examples match their registered doc locations.`
  );
}
