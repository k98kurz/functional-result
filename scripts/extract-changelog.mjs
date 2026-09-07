import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const HEADING_RE = /^## (\d+\.\d+\.\d+)/;

export function extractTopEntries(text, count) {
  const lines = text.split('\n');
  const headingIndices = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      headingIndices.push(i);
    }
  }
  if (headingIndices.length === 0) return [];

  const take = Math.min(count, headingIndices.length);
  const entries = [];
  for (let i = 0; i < take; i += 1) {
    const start = headingIndices[i];
    const end =
      i + 1 < headingIndices.length ? headingIndices[i + 1] : lines.length;
    entries.push(lines.slice(start, end).join('\n'));
  }
  return entries;
}

export function getTopVersion(text) {
  const match = text.match(HEADING_RE);
  return match ? match[1] : null;
}

export function matchesVersion(text, pkgVersion) {
  return getTopVersion(text) === pkgVersion;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main(argv) {
  const changelogPath = argv[0] || path.join(repoRoot, 'changelog.md');
  const packagePath = path.join(repoRoot, 'package.json');
  const destPath =
    argv[1] || path.join(repoRoot, 'dist', 'references', 'changelog.md');

  if (!fs.existsSync(changelogPath)) {
    console.error(`extract-changelog: changelog not found at ${changelogPath}`);
    process.exit(1);
  }

  const pkg = readJson(packagePath);
  const pkgVersion = pkg.version;
  const text = fs.readFileSync(changelogPath, 'utf8');

  if (!matchesVersion(text, pkgVersion)) {
    console.error(
      `extract-changelog: top changelog entry is "${getTopVersion(text)}" but ` +
        `package.json version is "${pkgVersion}". Update changelog.md before building.`
    );
    process.exit(1);
  }

  const entries = extractTopEntries(text, 2);
  if (entries.length === 0) {
    console.error(
      'extract-changelog: no "## version" entries found in changelog.md'
    );
    process.exit(1);
  }

  const generated =
    '<!-- Generated at build time from changelog.md; do not edit. -->\n' +
    entries.join('\n') +
    '\n';

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, generated);
  console.log(`Extracted changelog entries to ${destPath}`);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  main(process.argv.slice(2));
}
