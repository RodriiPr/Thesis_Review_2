import type { AnalysisResult, PipelineOptions } from './types.js';
import { extractText } from './extractor.js';
import { buildAnalysisPrompt, buildReferenceExtractionPrompt } from './prompts.js';
import { mockAnalyze } from './mock-analyzer.js';

type LlmProvider = { type: 'ollama' | 'deepseek'; apiKey?: string; model: string };

function detectProvider(): LlmProvider {
  if (process.env.OLLAMA_MODEL) {
    return {
      type: 'ollama',
      model: process.env.OLLAMA_MODEL,
    };
  }
  return {
    type: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  };
}

async function createLlm(provider: LlmProvider, temperature = 0.2, maxTokens = 2048) {
  if (provider.type === 'ollama') {
    const { Ollama } = await import('@langchain/ollama');
    return new Ollama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
      model: provider.model,
      temperature,
    });
  }
  const { ChatDeepSeek } = await import('@langchain/deepseek');
  return new ChatDeepSeek({
    apiKey: provider.apiKey || '',
    model: provider.model,
    temperature,
    maxTokens,
  });
}

async function createEmbeddings() {
  if (process.env.OLLAMA_MODEL) {
    const { OllamaEmbeddings } = await import('@langchain/ollama');
    return new OllamaEmbeddings({
      model: process.env.OLLAMA_MODEL,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
    });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const { OpenAIEmbeddings } = await import('@langchain/openai');
  return new OpenAIEmbeddings({
    apiKey,
    modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  });
}

function parseJsonResponse<T>(content: string, pattern: RegExp): T | null {
  const match = content.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export class AnalysisPipeline {
  private readonly maxGrade: number;
  private readonly provider: LlmProvider;

  constructor(options: PipelineOptions = {}) {
    this.maxGrade = options.maxGrade ?? 20;

    if (options.ollamaModel) {
      this.provider = { type: 'ollama', model: options.ollamaModel };
    } else if (options.deepseekKey) {
      this.provider = { type: 'deepseek', apiKey: options.deepseekKey, model: options.deepseekModel || 'deepseek-v4-flash' };
    } else {
      this.provider = detectProvider();
    }
  }

  async extractText(buffer: Buffer, fileType: 'pdf' | 'docx'): Promise<string> {
    return extractText(buffer, fileType);
  }

  async analyze(
    advanceText: string,
    templateSchema: object,
    templateText: string,
    advanceType: string,
  ): Promise<AnalysisResult> {
    const start = Date.now();

    if (this.provider.type === 'deepseek' && !this.provider.apiKey) {
      return mockAnalyze(advanceText, this.maxGrade);
    }

    try {
      const llm = await createLlm(this.provider, 0.2, 2048);
      const prompt = buildAnalysisPrompt(advanceText, templateSchema, templateText, advanceType);
      const response = await llm.invoke(prompt);
      const content = typeof response === 'string' ? response : (response as any).content || JSON.stringify(response);

      const parsed = parseJsonResponse<{
        scores: { structure: number; content: number; form: number; originality: number };
        executiveSummary: string;
        findings: Array<{
          sectionRef: string;
          pageRef?: number | null;
          severity: string;
          description: string;
          correctionSteps: string;
          exampleImprovement: string;
          recommendation: string;
        }>;
      }>(content, /\{[\s\S]*\}/);

      if (!parsed) {
        throw new Error('LLM response did not contain valid JSON');
      }

      const s = parsed.scores;
      const overall = Math.round(s.structure * 0.3 + s.content * 0.4 + s.form * 0.2 + s.originality * 0.1);
      const grade = parseFloat(((overall / 100) * this.maxGrade).toFixed(1));

      const validSeverities = new Set(['CRITICAL', 'MAJOR', 'MINOR', 'SUGGESTION']);

      return {
        scores: {
          structure: Math.round(Math.min(100, Math.max(0, s.structure))),
          content: Math.round(Math.min(100, Math.max(0, s.content))),
          form: Math.round(Math.min(100, Math.max(0, s.form))),
          originality: Math.round(Math.min(100, Math.max(0, s.originality))),
          overall,
        },
        grade,
        executiveSummary: parsed.executiveSummary ?? '',
        findings: (parsed.findings ?? []).map((f) => ({
          sectionRef: f.sectionRef ?? 'General',
          pageRef: f.pageRef ?? undefined,
          severity: (validSeverities.has(f.severity) ? f.severity : 'MINOR') as 'CRITICAL' | 'MAJOR' | 'MINOR' | 'SUGGESTION',
          description: f.description ?? '',
          correctionSteps: f.correctionSteps ?? '',
          exampleImprovement: f.exampleImprovement ?? '',
          recommendation: f.recommendation ?? '',
        })),
        processingMs: Date.now() - start,
      };
    } catch (err) {
      console.warn(`[AnalysisPipeline] LLM call failed, falling back to mock:`, (err as Error).message);
      return mockAnalyze(advanceText, this.maxGrade);
    }
  }

  async extractReferences(text: string): Promise<Array<{
    rawText: string;
    title: string;
    authors: string;
    year: number | null;
    doi: string | null;
    journal: string | null;
  }>> {
    if (this.provider.type === 'deepseek' && !this.provider.apiKey) {
      return [];
    }

    try {
      const llm = await createLlm(this.provider, 0, 2048);
      const prompt = buildReferenceExtractionPrompt(text);
      const response = await llm.invoke(prompt);
      const content = typeof response === 'string' ? response : (response as any).content || '';
      const parsed = parseJsonResponse<Array<{
        rawText: string;
        title: string;
        authors: string;
        year: number | null;
        doi: string | null;
        journal: string | null;
      }>>(content, /\[[\s\S]*\]/);
      return parsed ?? [];
    } catch {
      return [];
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await createEmbeddings();
    if (!embeddings) {
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }

    try {
      return embeddings.embedQuery(text.substring(0, 8000));
    } catch {
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }
  }
}
