import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  findByProgram(programId: string) {
    return this.prisma.thesisTemplate.findMany({
      where: { programId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
