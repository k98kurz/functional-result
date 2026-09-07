import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  getSourcePath,
  getReferencesPath,
  getTargetPath,
  runExport,
  printHelp,
  cli,
} from '../src/bin/functional-result-skill-export.js';

vi.mock('fs');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Skill Export', () => {
  describe('getTargetPath', () => {
    it('[S01] returns correct path for each known platform', () => {
      expect(getTargetPath('claude')).toBe('.claude/skills/functional-result/');
      expect(getTargetPath('codex')).toBe('.agent/skills/functional-result/');
      expect(getTargetPath('cursor')).toBe('.cursor/skills/functional-result/');
      expect(getTargetPath('opencode')).toBe(
        '.opencode/skills/functional-result/'
      );
    });

    it('[S02] returns default path for unknown platform', () => {
      expect(getTargetPath('unknown')).toBe('.agent/skills/functional-result/');
    });
  });

  describe('getSourcePath', () => {
    it('[S03] returns absolute path ending with SKILL.md', () => {
      const sourcePath = getSourcePath();
      expect(sourcePath).toMatch(/SKILL\.md$/);
    });
  });

  describe('getReferencesPath', () => {
    it('[S08] returns absolute path ending with references', () => {
      const referencesPath = getReferencesPath();
      expect(referencesPath).toMatch(/references$/);
    });
  });

  describe('runExport', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('[S09] copies references directory when it exists', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      vi.mocked(
        fs.readdirSync as (path: fs.PathLike) => string[]
      ).mockReturnValueOnce(['changelog.md']);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});

      const sourcePath = getSourcePath();
      const referencesPath = getReferencesPath();
      const targetPath = '/mock/target';

      runExport(sourcePath, referencesPath, targetPath);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('references'),
        expect.any(Object)
      );
      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(fs.readdirSync).toHaveBeenCalledWith(referencesPath);
    });

    it('[S10] does not copy references when directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

      const sourcePath = getSourcePath();
      const referencesPath = getReferencesPath();
      const targetPath = '/mock/target';

      runExport(sourcePath, referencesPath, targetPath);

      expect(fs.mkdirSync).toHaveBeenCalledWith(targetPath, expect.any(Object));
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe('printHelp', () => {
    it('[S04] prints usage information', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printHelp();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    });
  });

  describe('cli', () => {
    it('[S05] prints help and exits 0 with --help flag', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      cli(['--help']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('[S06] exports SKILL.md to correct platform path', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      cli(['opencode']);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('.opencode/skills/functional-result/SKILL.md')
      );
      expect(exitSpy).not.toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it('[S07] logs error and exits 1 on filesystem failure', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
        throw new Error('permission denied');
      });
      cli(['opencode']);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('permission denied')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
