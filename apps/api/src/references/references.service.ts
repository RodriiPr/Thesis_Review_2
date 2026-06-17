import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AnalysisPipeline } from '@thesis-review/ai-engine';

const CROSSREF_BASE = 'https://api.crossref.org/works';
const RATE_LIMIT_MS = 1100;

interface ExtractedReference {
  rawText: string;
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
  journal: string | null;
}

interface CrossRefWork {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  'published-print'?: { 'date-parts'?: [[number]] };
  'container-title'?: string[];
  score?: number;
}

@Injectable()
export class ReferencesService {
  private readonly logger = new Logger(ReferencesService.name);
  private readonly pipeline: AnalysisPipeline;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {
    this.pipeline = new AnalysisPipeline({ deepseekKey: process.env.DEEPSEEK_API_KEY });
  }

  async getReport(advanceId: string) {
    const refs = await this.prisma.referenceValidation.findMany({
      where: { advanceId },
      orderBy: { createdAt: 'asc' },
    });
    if (refs.length === 0) return null;

    return {
      totalRefs: refs.length,
      references: refs,
    };
  }

  async analyze(advanceId: string) {
    const advance = await this.prisma.advance.findUnique({
      where: { id: advanceId },
      select: { fileKey: true, fileType: true },
    });
    if (!advance) throw new NotFoundException('Avance no encontrado');

    setImmediate(() =>
      this.runAnalysis(advanceId, advance.fileKey, advance.fileType).catch((err) =>
        this.logger.error(`Reference validation failed for ${advanceId}`, err),
      ),
    );

    return { status: 'processing', message: 'Verificación de referencias iniciada' };
  }

  private async runAnalysis(advanceId: string, fileKey: string, fileType: string) {
    let text = '';
    try {
      const buffer = await this.storage.download(fileKey);
      text = await this.pipeline.extractText(buffer, fileType as 'pdf' | 'docx');
    } catch (err) {
      this.logger.warn(`Could not extract text for reference check: ${(err as Error).message}`);
    }

    const extracted: ExtractedReference[] = text
      ? await this.extractReferences(text)
      : this.extractReferencesWithRegex(text);

    if (extracted.length === 0) {
      this.logger.log(`No references found in advance ${advanceId}`);
      return;
    }

    await this.prisma.referenceValidation.deleteMany({ where: { advanceId } });

    const results: Array<{
      advanceId: string;
      rawText: string;
      title: string | null;
      authors: string | null;
      year: number | null;
      doi: string | null;
      journal: string | null;
      status: string;
      suggestion: string | null;
      crossrefData: object | null;
    }> = [];

    for (const ref of extracted) {
      await this.sleep(RATE_LIMIT_MS);
      const validated = await this.validateWithCrossRef(ref);
      results.push({ advanceId, ...validated });
    }

    await this.prisma.referenceValidation.createMany({
      data: results.map((r) => ({
        ...r,
        crossrefData: r.crossrefData ?? undefined,
      })),
    });
    this.logger.log(`Reference validation done for ${advanceId}: ${results.length} refs`);
  }

  private async extractReferences(text: string): Promise<ExtractedReference[]> {
    const aiRefs = await this.pipeline.extractReferences(text);
    if (aiRefs.length > 0) return aiRefs;
    return this.extractReferencesWithRegex(text);
  }

  private extractReferencesWithRegex(text: string): ExtractedReference[] {
    const refSection = text.match(/referencias?(?:\s+bibliogr[aá]ficas?)?\s*\n([\s\S]+?)(?:\n\s*\n\s*[A-Z]|$)/i);
    const source = refSection ? refSection[1] : text;

    const lines = source.split('\n').map((l) => l.trim()).filter((l) => l.length > 40);
    const refs: ExtractedReference[] = [];

    for (const line of lines.slice(0, 50)) {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const doiMatch = line.match(/10\.\d{4,}\/\S+/);
      refs.push({
        rawText: line,
        title: line.substring(0, 120),
        authors: '',
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        doi: doiMatch ? doiMatch[0].replace(/[.,)]+$/, '') : null,
        journal: null,
      });
    }

    return refs;
  }

  private async validateWithCrossRef(ref: ExtractedReference): Promise<{
    rawText: string;
    title: string | null;
    authors: string | null;
    year: number | null;
    doi: string | null;
    journal: string | null;
    status: string;
    suggestion: string | null;
    crossrefData: object | null;
  }> {
    const base = {
      rawText: ref.rawText,
      title: ref.title || null,
      authors: ref.authors || null,
      year: ref.year,
      doi: ref.doi,
      journal: ref.journal,
    };

    try {
      if (ref.doi) {
        const work = await this.fetchCrossRefByDoi(ref.doi);
        if (work) {
          const crossrefYear = work['published-print']?.['date-parts']?.[0]?.[0] ?? null;
          const yearMatch = !ref.year || !crossrefYear || Math.abs(ref.year - crossrefYear) <= 1;
          const status = yearMatch ? 'VERIFIED' : 'DOI_INCORRECT';
          const suggestion = !yearMatch
            ? `El año correcto según CrossRef es ${crossrefYear}.`
            : null;
          return { ...base, status, suggestion, crossrefData: work };
        }
        return { ...base, status: 'DOI_INCORRECT', suggestion: 'El DOI proporcionado no existe en CrossRef.', crossrefData: null };
      }

      if (ref.title && ref.title.length > 10) {
        const work = await this.fetchCrossRefByQuery(ref.title);
        if (work) {
          const score = work.score ?? 0;
          if (score >= 80) {
            return {
              ...base,
              doi: work.DOI ?? ref.doi,
              status: 'VERIFIED',
              suggestion: work.DOI ? `DOI encontrado: ${work.DOI}` : null,
              crossrefData: work,
            };
          }
          if (score >= 40) {
            return {
              ...base,
              status: 'UNINDEXED',
              suggestion: `Posible coincidencia encontrada con score ${Math.round(score)}/100. Verifique los metadatos.`,
              crossrefData: work,
            };
          }
        }

        const isSuspicious = this.isSuspiciousReference(ref);
        return {
          ...base,
          status: isSuspicious ? 'POSSIBLE_HALLUCINATION' : 'NOT_FOUND',
          suggestion: isSuspicious
            ? `La referencia "${ref.title.substring(0, 60)}..." no fue encontrada en CrossRef ni Google Scholar. Verifique si existe realmente.`
            : `No se encontró esta referencia en CrossRef. Intente buscar en Google Scholar o ResearchGate.`,
          crossrefData: null,
        };
      }

      return { ...base, status: 'DOI_MISSING', suggestion: 'Esta referencia no tiene DOI. Considere agregarlo para mayor credibilidad.', crossrefData: null };
    } catch (err) {
      this.logger.warn(`CrossRef lookup failed for "${ref.title}": ${(err as Error).message}`);
      return { ...base, status: 'UNINDEXED', suggestion: null, crossrefData: null };
    }
  }

  private async fetchCrossRefByDoi(doi: string): Promise<CrossRefWork | null> {
    const url = `${CROSSREF_BASE}/${encodeURIComponent(doi)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ThesisReview/1.0 (mailto:admin@unitru.edu.pe)' } });
    if (!res.ok) return null;
    const json = await res.json() as { message?: CrossRefWork };
    return json.message ?? null;
  }

  private async fetchCrossRefByQuery(title: string): Promise<CrossRefWork | null> {
    const query = encodeURIComponent(title.substring(0, 200));
    const url = `${CROSSREF_BASE}?query=${query}&rows=1&select=DOI,title,author,published-print,container-title,score`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ThesisReview/1.0 (mailto:admin@unitru.edu.pe)' } });
    if (!res.ok) return null;
    const json = await res.json() as { message?: { items?: CrossRefWork[] } };
    return json.message?.items?.[0] ?? null;
  }

  private isSuspiciousReference(ref: ExtractedReference): boolean {
    const title = (ref.title ?? '').toLowerCase();
    const suspiciousPatterns = [
      /intelligence artificielle?/i,
      /machine learning avanzado/i,
      /\d{4}[a-z]/,
    ];
    if (suspiciousPatterns.some((p) => p.test(title))) return true;
    if (ref.year && (ref.year > new Date().getFullYear() + 1 || ref.year < 1900)) return true;
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
