import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    advanceId?: string;
  }) {
    return this.prisma.notification.create({ data: params });
  }

  async notifyReviewComplete(advanceId: string) {
    const advance = await this.prisma.advance.findUnique({
      where: { id: advanceId },
      select: {
        studentId: true,
        title: true,
        status: true,
        review: {
          select: { reviewer: { select: { name: true } } },
        },
      },
    });
    if (!advance) return;

    const statusLabels: Record<string, string> = {
      APPROVED: 'aprobado',
      OBSERVED: 'observado',
      REJECTED: 'rechazado',
    };

    const label = statusLabels[advance.status] ?? 'revisado';
    await this.create({
      userId: advance.studentId,
      type: 'review_complete',
      title: 'Revisión completada',
      message: `Tu avance "${advance.title}" ha sido ${label} por tu asesor.`,
      advanceId,
    });
  }

  async notifyAiComplete(advanceId: string) {
    const advance = await this.prisma.advance.findUnique({
      where: { id: advanceId },
      select: { studentId: true, title: true },
    });
    if (!advance) return;

    await this.create({
      userId: advance.studentId,
      type: 'ai_complete',
      title: 'Análisis IA completado',
      message: `El análisis automático de "${advance.title}" ha finalizado. Ya puedes revisar los resultados.`,
      advanceId,
    });
  }

  async listByUser(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
