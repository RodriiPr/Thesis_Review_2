import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AnalysisPipeline } from '@thesis-review/ai-engine';

const SIMILARITY_THRESHOLD = 0.85;
const CHUNK_SIZE = 500;

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);
  private readonly pipeline: AnalysisPipeline;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {
    this.pipeline = new AnalysisPipeline({
      deepseekKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  async getReport(advanceId: string) {
    const report = await this.prisma.plagiarismReport.findUnique({
      where: { advanceId },
      include: {
        alerts: {
          include: {
            targetAdvance: {
              select: {
                id: true,
                title: true,
                student: { select: { name: true } },
              },
            },
          },
          orderBy: { similarity: 'desc' },
        },
      },
    });
    return report;
  }

  async analyze(advanceId: string, method: 'embeddings' | 'copyleaks' = 'embeddings') {
    const advance = await this.prisma.advance.findUnique({
      where: { id: advanceId },
      select: { id: true, programId: true, fileKey: true, fileType: true },
    });
    if (!advance) throw new NotFoundException('Avance no encontrado');

    await this.prisma.plagiarismReport.upsert({
      where: { advanceId },
      create: { advanceId, status: 'processing', method, overallScore: 0 },
      update: { status: 'processing', method },
    });

    setImmediate(() => this.runAnalysis(advance, method).catch((err) =>
      this.logger.error(`Plagiarism analysis failed for ${advanceId}`, err),
    ));

    return { status: 'processing', advanceId };
  }

  private async runAnalysis(
    advance: { id: string; programId: string; fileKey: string; fileType: string },
    method: 'embeddings' | 'copyleaks',
  ) {
    if (method === 'copyleaks') {
      await this.runCopyleaksAnalysis(advance.id);
      return;
    }
    await this.runEmbeddingsAnalysis(advance);
  }

  private async runEmbeddingsAnalysis(advance: {
    id: string;
    programId: string;
    fileKey: string;
    fileType: string;
  }) {
    let text = '';
    try {
      const buffer = await this.storage.download(advance.fileKey);
      text = await this.pipeline.extractText(buffer, advance.fileType as 'pdf' | 'docx');
    } catch (err) {
      this.logger.warn(`Could not extract text for plagiarism check: ${(err as Error).message}`);
    }

    if (!text) {
      await this.prisma.plagiarismReport.update({
        where: { advanceId: advance.id },
        data: { status: 'completed', analyzedAt: new Date() },
      });
      return;
    }

    const chunks = this.splitIntoChunks(text, CHUNK_SIZE);
    const embeddings: { sectionName: string; content: string; embedding: number[] }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.pipeline.generateEmbedding(chunks[i]);
      embeddings.push({
        sectionName: `Chunk ${i + 1}`,
        content: chunks[i],
        embedding,
      });
    }

    await this.prisma.advanceChunk.deleteMany({ where: { advanceId: advance.id } });

    for (let i = 0; i < embeddings.length; i++) {
      const e = embeddings[i];
      const vectorLiteral = `[${e.embedding.join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO advance_chunks (id, advance_id, program_id, section_name, content, chunk_index, embedding, created_at)
        VALUES (
          gen_random_uuid()::text,
          ${advance.id},
          ${advance.programId},
          ${e.sectionName},
          ${e.content},
          ${i},
          ${vectorLiteral}::vector,
          NOW()
        )
      `;
    }

    const alerts: Array<{
      sectionName: string;
      similarity: number;
      severity: string;
      sourceSnippet: string;
      targetSnippet: string;
      targetAdvanceId: string;
    }> = [];

    for (const chunk of embeddings) {
      const vectorLiteral = `[${chunk.embedding.join(',')}]`;
      const similar = await this.prisma.$queryRaw<
        Array<{ advance_id: string; content: string; similarity: number }>
      >`
        SELECT ac.advance_id, ac.content,
               1 - (ac.embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM advance_chunks ac
        WHERE ac.program_id = ${advance.programId}
          AND ac.advance_id != ${advance.id}
          AND 1 - (ac.embedding <=> ${vectorLiteral}::vector) > ${SIMILARITY_THRESHOLD}
        ORDER BY similarity DESC
        LIMIT 3
      `;

      for (const match of similar) {
        alerts.push({
          sectionName: chunk.sectionName,
          similarity: match.similarity,
          severity: match.similarity >= 0.92 ? 'critical' : 'warning',
          sourceSnippet: chunk.content.substring(0, 200),
          targetSnippet: match.content.substring(0, 200),
          targetAdvanceId: match.advance_id,
        });
      }
    }

    const maxSimilarity = alerts.length > 0 ? Math.max(...alerts.map((a) => a.similarity)) * 100 : 0;

    const report = await this.prisma.plagiarismReport.findUnique({ where: { advanceId: advance.id } });
    if (report) {
      await this.prisma.plagiarismAlert.deleteMany({ where: { reportId: report.id } });
      if (alerts.length > 0) {
        await this.prisma.plagiarismAlert.createMany({
          data: alerts.map((a) => ({ ...a, reportId: report.id })),
        });
      }
    }

    await this.prisma.plagiarismReport.update({
      where: { advanceId: advance.id },
      data: { status: 'completed', overallScore: maxSimilarity, analyzedAt: new Date() },
    });

    this.logger.log(`Plagiarism check done for ${advance.id}: ${alerts.length} alerts, max ${maxSimilarity.toFixed(1)}%`);
  }

  private async runCopyleaksAnalysis(advanceId: string) {
    const apiKey = process.env.COPYLEAKS_API_KEY;
    if (!apiKey) {
      await this.prisma.plagiarismReport.update({
        where: { advanceId },
        data: {
          status: 'completed',
          overallScore: 0,
          analyzedAt: new Date(),
        },
      });
      this.logger.warn('Copyleaks API key not configured — skipping external check');
      return;
    }
    this.logger.warn('Copyleaks integration pending API key configuration');
    await this.prisma.plagiarismReport.update({
      where: { advanceId },
      data: { status: 'completed', analyzedAt: new Date() },
    });
  }

  private splitIntoChunks(text: string, size: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += size) {
      chunks.push(words.slice(i, i + size).join(' '));
    }
    return chunks.filter((c) => c.trim().length > 50);
  }
}
