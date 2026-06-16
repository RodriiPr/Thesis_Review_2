export type FindingSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'SUGGESTION';

export interface AiFinding {
  sectionRef: string;
  pageRef?: number;
  severity: FindingSeverity;
  description: string;
  correctionSteps: string;
  exampleImprovement: string;
  recommendation: string;
}

export interface AnalysisScores {
  structure: number;
  content: number;
  form: number;
  originality: number;
  overall: number;
}

export interface AnalysisResult {
  scores: AnalysisScores;
  grade: number;
  executiveSummary: string;
  findings: AiFinding[];
  processingMs: number;
}

export interface PipelineOptions {
  deepseekKey?: string;
  deepseekModel?: string;
  maxGrade?: number;
}
