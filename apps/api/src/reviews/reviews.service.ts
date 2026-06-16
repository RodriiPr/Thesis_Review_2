import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  async getReviewPanel(advanceId: string) {
    const advance = await this.prisma.advance.findUniqueOrThrow({
      where: { id: advanceId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        program: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, version: true, rubric: true } },
        aiAnalysis: {
          include: {
            findings: { orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] },
          },
        },
        review: { include: { reviewer: { select: { id: true, name: true } } } },
      },
    });

    return { advance, plagiarism: null, references: null };
  }

  async saveHumanReview(params: {
    advanceId: string;
    reviewerId: string;
    finalGrade?: number;
    humanComment?: string;
    rubricAnswers?: Record<string, boolean>;
    status: 'OBSERVED' | 'APPROVED' | 'REJECTED';
  }) {
    const { advanceId, reviewerId, finalGrade, humanComment, rubricAnswers, status } = params;

    const advance = await this.prisma.advance.findUniqueOrThrow({ where: { id: advanceId } });
    if (['APPROVED', 'REJECTED'].includes(advance.status)) {
      throw new BadRequestException('El avance ya fue procesado definitivamente');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.upsert({
        where: { advanceId },
        create: {
          advanceId,
          reviewerId,
          finalGrade,
          humanComment,
          rubricAnswers: rubricAnswers ?? {},
          status,
          reviewedAt: new Date(),
        },
        update: {
          finalGrade,
          humanComment,
          rubricAnswers: rubricAnswers ?? {},
          status,
          reviewedAt: new Date(),
        },
      });
      await tx.advance.update({ where: { id: advanceId }, data: { status } });
      return r;
    });

    await this.notifications.notifyReviewComplete(advanceId);
    return review;
  }
}
