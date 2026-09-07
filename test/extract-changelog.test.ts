import { describe, it, expect } from 'vitest';
import {
  extractTopEntries,
  getTopVersion,
  matchesVersion,
} from '../scripts/extract-changelog.mjs';

const sample = `## 0.0.14 (WIP)

- first bullet
- second bullet

## 0.0.13

- previous bullet

## 0.0.12

- older bullet
`;

describe('extract-changelog', () => {
  describe('extractTopEntries', () => {
    it('returns the top N entries including their headings', () => {
      const entries = extractTopEntries(sample, 2);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatch(/^## 0\.0\.14 \(WIP\)/);
      expect(entries[0]).toContain('- first bullet');
      expect(entries[1]).toMatch(/^## 0\.0\.13/);
      expect(entries[1]).toContain('- previous bullet');
      expect(entries[1]).not.toContain('- older bullet');
    });

    it('returns a single entry when only one heading exists', () => {
      const single = '## 1.0.0\n\n- only bullet\n';
      expect(extractTopEntries(single, 2)).toEqual([single]);
    });
  });

  describe('getTopVersion', () => {
    it('extracts the version from the top heading', () => {
      expect(getTopVersion(sample)).toBe('0.0.14');
    });

    it('handles a heading with a plain version', () => {
      expect(getTopVersion('## 1.2.3\n\n- x\n')).toBe('1.2.3');
    });

    it('returns null when there is no version heading', () => {
      expect(getTopVersion('no headings here')).toBeNull();
    });
  });

  describe('matchesVersion', () => {
    it('is true when the top entry version equals the package version', () => {
      expect(matchesVersion(sample, '0.0.14')).toBe(true);
    });

    it('is false when they differ', () => {
      expect(matchesVersion(sample, '9.9.9')).toBe(false);
    });
  });
});
