import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const entry = path.join(repoRoot, 'dist', 'functional-result.js');
const tmp = path.join(repoRoot, 'dist', '.functional-result.min.js');

async function main() {
  await fs.access(entry);
  await build({
    entryPoints: [entry],
    outfile: tmp,
    bundle: false,
    minify: true,
    sourcemap: true,
    sourcesContent: true,
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  let code = await fs.readFile(tmp, 'utf8');
  code = code.replace(
    /\/\/# sourceMappingURL=.*$/m,
    '//# sourceMappingURL=functional-result.js.map'
  );
  const map = await fs.readFile(`${tmp}.map`, 'utf8');

  await fs.writeFile(entry, code);
  await fs.writeFile(`${entry}.map`, map);
  await fs.rm(tmp, { force: true });
  await fs.rm(`${tmp}.map`, { force: true });

  const { size } = await fs.stat(entry);
  console.log(`Minified ${path.relative(repoRoot, entry)} (${size} bytes)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
