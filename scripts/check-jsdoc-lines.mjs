#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

function findTsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (extname(fullPath) === '.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findTsFiles('src');
let hasErrors = false;

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  let inJsdoc = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('/**') && !trimmed.startsWith('/**/')) {
      inJsdoc = true;
      continue;
    }

    if (inJsdoc && trimmed.endsWith('*/')) {
      inJsdoc = false;
      continue;
    }

    if (inJsdoc) {
      const len = line.length;
      if (len > 85) {
        console.error(
          `${file}:${i + 1}:${len} [JSDOC-LEN] ERROR Line is ${len} chars (hard limit 85)`
        );
        hasErrors = true;
      } else if (len > 80) {
        console.warn(
          `${file}:${i + 1}:${len} [JSDOC-LEN] WARN Line is ${len} chars (soft limit 80)`
        );
      }
    }
  }
}

if (hasErrors) {
  console.error(
    '\n[JSDOC-LEN] Hard limit violations found — fix before committing.'
  );
  process.exit(1);
}

console.log('[JSDOC-LEN] All JSDoc lines within limits.');
