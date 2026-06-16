import { Injectable, Logger } from '@nestjs/common';
import { AnalysisPipeline } from '@thesis-review/ai-engine';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private pipeline: AnalysisPipeline;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notifications: NotificationService,
  ) {
    this.pipeline = new AnalysisPipeline({
      deepseekKey: process.env.DEEPSEEK_API_KEY,
      maxGrade: Number(process.env.MAX_GRADE ?? 20),
    });
  }

  async runAnalysis(advanceId: string) {
    await this.prisma.advance.update({
      where: { id: advanceId },
      data: { status: 'AI_PROCESSING' },
    });

    try {
      const advance = await this.prisma.advance.findUniqueOrThrow({
        where: { id: advanceId },
        include: { template: true },
      });

      let advanceText: string;
      try {
        const fileBuffer = await this.storage.download(advance.fileKey);
        advanceText = await this.pipeline.extractText(
          fileBuffer,
          advance.fileType as 'pdf' | 'docx',
        );
      } catch (err) {
        this.logger.warn(`Could not download advance file: ${(err as Error).message}`);
        advanceText =
          'Contenido del documento no disponible en almacenamiento. Análisis basado en metadatos del avance.';
      }

      let templateText = JSON.stringify(advance.template.extractedSchema, null, 2);
      try {
        const templateBuffer = await this.storage.download(advance.template.fileKey);
        templateText = await this.pipeline.extractText(
          templateBuffer,
          advance.template.fileKey.endsWith('.pdf') ? 'pdf' : 'docx',
        );
      } catch {
        this.logger.warn('Template file not in storage — using extracted schema JSON');
      }

      const result = await this.pipeline.analyze(
        advanceText,
        advance.template.extractedSchema as object,
        templateText,
        advance.advanceType,
      );

      await this.prisma.aIAnalysis.deleteMany({ where: { advanceId } });

      await this.prisma.aIAnalysis.create({
        data: {
          advanceId,
          structureScore: result.scores.structure,
          contentScore: result.scores.content,
          formScore: result.scores.form,
          originalityScore: result.scores.originality,
          overallScore: result.scores.overall,
          gradeConverted: result.grade,
          executiveSummary: result.executiveSummary,
          processingMs: result.processingMs,
          modelUsed: process.env.DEEPSEEK_API_KEY ? 'deepseek-v4-flash' : 'mock-analyzer',
          findings: {
            create: result.findings.map((f) => ({
              sectionRef: f.sectionRef,
              pageRef: f.pageRef ?? null,
              severity: f.severity,
              description: f.description,
              correctionSteps: f.correctionSteps,
              exampleImprovement: f.exampleImprovement,
              recommendation: f.recommendation,
            })),
          },
        },
      });

      await this.prisma.advance.update({
        where: { id: advanceId },
        data: { status: 'AI_COMPLETE' },
      });

      await this.notifications.notifyAiComplete(advanceId);

      this.logger.log(`AI analysis completed for advance ${advanceId}`);
    } catch (err) {
      this.logger.error(`AI analysis failed for ${advanceId}`, err);
      await this.prisma.advance.update({
        where: { id: advanceId },
        data: { status: 'PENDING' },
      });
      throw err;
    }
  }
}
