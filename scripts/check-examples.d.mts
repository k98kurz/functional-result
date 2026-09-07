export interface Finding {
  file: string;
  line: number;
  code: string;
  msg: string;
}

export interface Counts {
  docs: string[];
  tsFences: number;
  otherFences: number;
  examples: number;
}

export interface DocFence {
  lang: string;
  startLine: number;
  lines: string[];
  body?: string;
  id?: string;
  sentinelLine?: number;
}

export interface ExampleInfo {
  file: string;
  docs: string[];
  region: string;
  regionLines: string[];
  regionValid: boolean;
  regionStartLine: number;
  illustrative: boolean;
}

export interface Mismatch {
  doc: string;
  fence: DocFence;
  example: ExampleInfo;
}

export interface AnalysisResult {
  counts: Counts;
  findings: Finding[];
  docLines: Record<string, string[]>;
  mismatches: Mismatch[];
}

export interface AnalyzeOptions {
  docs?: string[];
  examplesDir?: string;
}

export function analyzeExamples(options?: AnalyzeOptions): AnalysisResult;
export function printFindings(findings: Finding[], counts: Counts): void;
