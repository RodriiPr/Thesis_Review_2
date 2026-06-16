import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchemaDto, UpdateSchemaDto } from './dto/schema.dto';
import { StructureExtractor } from './utils/structure-extractor';

@Injectable()
export class SchemesService {
  constructor(
    private prisma: PrismaService,
    private extractor: StructureExtractor,
  ) {}

  async create(dto: CreateSchemaDto, userId: string) {
    // Si es marcado como default, quitar default a los demás del mismo tipo
    if (dto.isDefault) {
      await this.prisma.documentSchema.updateMany({
        where: { type: dto.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentSchema.create({
      data: {
        ...dto,
        structure: dto.structure || {},
        createdById: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.documentSchema.findMany({
      where: {
        OR: [
          { createdById: userId },
          { isDefault: true }
        ],
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const schema = await this.prisma.documentSchema.findUnique({
      where: { id },
    });
    if (!schema) throw new NotFoundException('Esquema no encontrado');
    return schema;
  }

  async update(id: string, dto: UpdateSchemaDto) {
    if (dto.isDefault) {
      const current = await this.findOne(id);
      await this.prisma.documentSchema.updateMany({
        where: { type: dto.type || current.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentSchema.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.documentSchema.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async extractStructure(buffer: Buffer, fileType: 'pdf' | 'docx') {
    return this.extractor.extract(buffer, fileType);
  }
}
