export interface Source {
  title: string;
  source: string;
  module: string | null;
  excerpt: string;
}

export interface QAResult {
  answer: string;
  sources: Source[];
}

export interface QAPipelineOptions {
  deepseekKey?: string;
  deepseekModel?: string;
  temperature?: number;
  maxTokens?: number;
}
