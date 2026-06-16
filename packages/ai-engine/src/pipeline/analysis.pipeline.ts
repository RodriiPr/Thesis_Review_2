import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export interface AnalysisResult {
  scores: {
    structure: number;
    content: number;
    form: number;
    originality: number;
    overall: number;
  };
  grade: number;
  executiveSummary: string;
  findings: FindingOutput[];
  processingMs: number;
}

export interface FindingOutput {
  sectionRef: string;
  pageRef?: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'SUGGESTION';
  description: string;
  correctionSteps: string;
  exampleImprovement: string;
  recommendation: string;
}

const SYSTEM_PROMPT = `Eres un evaluador académico experto en tesis universitarias de posgrado.
Analiza el avance comparándolo con el documento patrón institucional.
Responde ÚNICAMENTE con JSON válido sin markdown.`;

export class AnalysisPipeline {
  private splitter: RecursiveCharacterTextSplitter;
  private useMock: boolean;
  private maxGrade: number;

  constructor(config: { deepseekKey?: string; maxGrade: number }) {
    this.maxGrade = config.maxGrade;
    this.useMock = !config.deepseekKey;
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' '],
    });
  }

  async extractText(fileBuffer: Buffer, fileType: 'pdf' | 'docx'): Promise<string> {
    if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }
    const data = await pdfParse(fileBuffer);
    return data.text;
  }

  async chunkDocument(text: string): Promise<string[]> {
    return this.splitter.splitText(text);
  }

  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return chunks.map(() => Array(8).fill(0.1));
    }
    try {
      const { OpenAIEmbeddings } = await import('@langchain/openai');
      const embeddings = new OpenAIEmbeddings({
        apiKey,
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      });
      return embeddings.embedDocuments(chunks);
    } catch {
      return chunks.map(() => Array(8).fill(0.1));
    }
  }

  async analyze(
    advanceText: string,
    templateSchema: object,
    templateText: string,
    advanceType: string,
  ): Promise<AnalysisResult> {
    const startMs = Date.now();

    if (this.useMock) {
      return this.mockAnalysis(startMs);
    }

    const userPrompt = `
DOCUMENTO PATRÓN — ESTRUCTURA ESPERADA:
${JSON.stringify(templateSchema, null, 2)}

FRAGMENTO DEL PATRÓN:
${templateText.substring(0, 3000)}

TIPO DE AVANCE: ${advanceType}

AVANCE DEL ESTUDIANTE:
${advanceText.substring(0, 8000)}

Responde con JSON: { "scores": { "structure", "content", "form", "originality" }, "executiveSummary", "findings": [...] }`;

    const { ChatDeepSeek } = await import('@langchain/deepseek');
    const llm = new ChatDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      temperature: 0.1,
    });

    const response = await llm.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    const parsed = JSON.parse(response.content as string);
    const s = parsed.scores;
    const overall =
      s.structure * 0.3 + s.content * 0.4 + s.form * 0.2 + s.originality * 0.1;
    const grade = (overall / 100) * this.maxGrade;

    return {
      scores: { ...s, overall: Math.round(overall * 10) / 10 },
      grade: Math.round(grade * 10) / 10,
      executiveSummary: parsed.executiveSummary,
      findings: parsed.findings,
      processingMs: Date.now() - startMs,
    };
  }

  private mockAnalysis(startMs: number): AnalysisResult {
    return {
      scores: {
        structure: 78,
        content: 72,
        form: 80,
        originality: 85,
        overall: 76.5,
      },
      grade: Math.round(((76.5 / 100) * this.maxGrade) * 10) / 10,
      executiveSummary:
        'Análisis simulado (sin OPENAI_API_KEY). El documento cumple parcialmente con el patrón. ' +
        'Revise las secciones señaladas antes de la entrega final.',
      findings: [
        {
          sectionRef: 'Marco teórico',
          pageRef: 12,
          severity: 'MAJOR',
          description: 'Faltan definiciones operacionales en el marco conceptual.',
          correctionSteps:
            'Incluya definiciones operacionales para cada constructo principal de su investigación.',
          exampleImprovement:
            'La variable independiente se define como el conjunto de estrategias pedagógicas aplicadas en el aula virtual.',
          recommendation: 'Consulte autores recientes del área (últimos 5 años).',
        },
        {
          sectionRef: 'Referencias bibliográficas',
          pageRef: 35,
          severity: 'MINOR',
          description: 'Algunas referencias no siguen el formato APA 7 de forma consistente.',
          correctionSteps: 'Revise mayúsculas, cursivas y DOI en cada entrada bibliográfica.',
          exampleImprovement: 'Apellido, N. (2024). Título del artículo. Revista, 10(2), 1-15. https://doi.org/10.xxx',
          recommendation: 'Use Zotero o Mendeley para normalizar citas.',
        },
      ],
      processingMs: Date.now() - startMs,
    };
  }
}
