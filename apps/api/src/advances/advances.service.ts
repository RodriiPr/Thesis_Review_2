import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import mammoth from 'mammoth';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class AdvancesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    @InjectQueue('ai-analysis') private aiQueue: Queue,
  ) {}

  async upload(params: {
    studentId: string;
    programId: string;
    templateId: string;
    advanceType: string;
    file: Express.Multer.File;
  }) {
    const { studentId, programId, templateId, advanceType, file } = params;

    if (!file) throw new BadRequestException('Archivo requerido');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Solo se aceptan archivos PDF o Word (.docx)');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 50 MB');
    }

    const template = await this.prisma.thesisTemplate.findFirst({
      where: { id: templateId, programId, isActive: true },
    });
    if (!template) throw new NotFoundException('Template no encontrado para este programa');

    const lastVersion = await this.prisma.advance.findFirst({
      where: { studentId, programId, advanceType },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    const fileType = file.mimetype.includes('pdf') ? 'pdf' : 'docx';
    const fileKey = `advances/${programId}/${studentId}/${advanceType}/v${version}.${fileType}`;
    await this.storage.upload(fileKey, file.buffer, file.mimetype);

    const advance = await this.prisma.advance.create({
      data: {
        studentId,
        programId,
        templateId,
        advanceType,
        version,
        fileKey,
        fileType,
        fileSizeBytes: file.size,
        title: `${advanceType} v${version}`,
        status: 'PENDING',
      },
    });

    await this.aiQueue.add(
      'analyze',
      { advanceId: advance.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return advance;
  }

  async getAdvanceDetail(advanceId: string, requesterId: string, requesterRole: string) {
    const advance = await this.prisma.advance.findUnique({
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

    if (!advance) throw new NotFoundException('Avance no encontrado');
    if (requesterRole === 'STUDENT' && advance.studentId !== requesterId) {
      throw new NotFoundException('Avance no encontrado');
    }
    return advance;
  }

  async listForStudent(studentId: string) {
    return this.prisma.advance.findMany({
      where: { studentId },
      include: {
        aiAnalysis: { select: { overallScore: true, gradeConverted: true } },
        program: { select: { name: true } },
      },
      orderBy: [{ advanceType: 'asc' }, { version: 'desc' }],
    });
  }

  async getVersionHistory(studentId: string, advanceType: string) {
    return this.prisma.advance.findMany({
      where: { studentId, advanceType },
      include: {
        aiAnalysis: { select: { overallScore: true, gradeConverted: true, createdAt: true } },
        review: { select: { status: true, finalGrade: true, reviewedAt: true } },
        program: { select: { name: true } },
      },
      orderBy: { version: 'asc' },
    });
  }

  async listForAdvisor(
    advisorId: string,
    filters: { status?: string; programId?: string; page?: number; pageSize?: number },
  ) {
    const { status, programId, page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;
    const where = {
      student: { advisorId },
      ...(status && { status: status as never }),
      ...(programId && { programId }),
    };

    const [advances, total] = await Promise.all([
      this.prisma.advance.findMany({
        where,
        include: {
          student: { select: { id: true, name: true } },
          program: { select: { name: true } },
          aiAnalysis: { select: { overallScore: true, gradeConverted: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.advance.count({ where }),
    ]);

    return { advances, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listAll(filters: {
    status?: string;
    programId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, programId, page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;
    const where = {
      ...(status && { status: status as never }),
      ...(programId && { programId }),
    };

    const [advances, total] = await Promise.all([
      this.prisma.advance.findMany({
        where,
        include: {
          student: { select: { id: true, name: true } },
          program: { select: { name: true } },
          aiAnalysis: { select: { overallScore: true, gradeConverted: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.advance.count({ where }),
    ]);

    return { advances, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async downloadFile(advanceId: string) {
    const advance = await this.prisma.advance.findUniqueOrThrow({
      where: { id: advanceId },
      select: { fileKey: true, fileType: true, title: true },
    });
    const buffer = await this.storage.download(advance.fileKey);
    const contentType =
      advance.fileType === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return { buffer, contentType, filename: `${advance.title}.${advance.fileType}` };
  }

  async getPreviewUrl(advanceId: string) {
    const advance = await this.prisma.advance.findUniqueOrThrow({
      where: { id: advanceId },
      select: { fileKey: true, fileType: true },
    });
    const url = await this.storage.getPresignedUrl(advance.fileKey, 900);
    return { url, fileType: advance.fileType };
  }

  async getPreviewContent(advanceId: string): Promise<{ html: string; fileType: string }> {
    const advance = await this.prisma.advance.findUniqueOrThrow({
      where: { id: advanceId },
      select: { fileKey: true, fileType: true },
    });

    if (advance.fileType !== 'docx') {
      const url = await this.storage.getPresignedUrl(advance.fileKey, 900);
      return { html: '', fileType: advance.fileType };
    }

    const buffer = await this.storage.download(advance.fileKey);
    const result = await mammoth.convertToHtml({ buffer });
    return { html: result.value, fileType: 'docx' };
  }
}
