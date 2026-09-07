import type { Counts, Finding } from './check-examples.mjs';

export interface FixedRecord {
  doc: string;
  id: string;
  line: number;
}

export interface SyncOptions {
  docs?: string[];
  examplesDir?: string;
}

export interface SyncResult {
  counts: Counts;
  findings: Finding[];
  fixed: FixedRecord[];
}

export function syncExamples(options?: SyncOptions): SyncResult;
