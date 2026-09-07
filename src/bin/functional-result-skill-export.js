#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const platformPaths = {
  claude: '.claude/skills/functional-result/',
  codex: '.agent/skills/functional-result/',
  cursor: '.cursor/skills/functional-result/',
  opencode: '.opencode/skills/functional-result/',
};

const defaultPath = '.agent/skills/functional-result/';

export function getSourcePath() {
  return path.join(__dirname, '..', 'SKILL.md');
}

export function getReferencesPath() {
  return path.join(__dirname, '..', 'references');
}

export function getTargetPath(platform) {
  return platformPaths[platform] || defaultPath;
}

export function runExport(sourcePath, referencesPath, targetFullPath) {
  // Create target directory
  fs.mkdirSync(targetFullPath, { recursive: true });

  // Copy main SKILL.md file
  const targetSkillPath = path.join(targetFullPath, 'SKILL.md');
  fs.copyFileSync(sourcePath, targetSkillPath);
  console.log(`Successfully exported SKILL.md to ${targetSkillPath}`);

  // Copy references directory if it exists
  if (fs.existsSync(referencesPath)) {
    const targetReferencesPath = path.join(targetFullPath, 'references');
    fs.mkdirSync(targetReferencesPath, { recursive: true });

    const referenceFiles = fs.readdirSync(referencesPath);
    for (const file of referenceFiles) {
      const srcFile = path.join(referencesPath, file);
      const destFile = path.join(targetReferencesPath, file);
      fs.copyFileSync(srcFile, destFile);
    }

    console.log(`Successfully exported references/ to ${targetReferencesPath}`);
  } else {
    console.log(`Warning: references directory not found at ${referencesPath}`);
  }
}

export function printHelp() {
  console.log('Usage: npx export-functional-result-skill [platform]');
  console.log('');
  console.log('Platforms:');
  console.log('  claude   - Export to .claude/skills/functional-result/');
  console.log('  codex    - Export to .agent/skills/functional-result/');
  console.log('  cursor   - Export to .cursor/skills/functional-result/');
  console.log('  opencode - Export to .opencode/skills/functional-result/');
  console.log(
    '  default  - Export to .agent/skills/functional-result/ (default)'
  );
}

export function cli(args = []) {
  const platform = args[0] || 'default';
  if (platform === '--help' || platform === '-h' || platform === 'help') {
    printHelp();
    process.exit(0);
  }
  const sourcePath = getSourcePath();
  const referencesPath = getReferencesPath();
  const targetRelPath = getTargetPath(platform);
  const targetFullPath = path.join(process.cwd(), targetRelPath);
  try {
    runExport(sourcePath, referencesPath, targetFullPath);
  } catch (error) {
    console.error(
      `Error exporting SKILL.md: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  cli(process.argv.slice(2));
}