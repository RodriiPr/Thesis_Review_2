import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AiAnalysisProcessor } from './ai-analysis.processor';
import { AiAnalysisService } from './ai-analysis.service';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'ai-analysis' })],
  providers: [AiAnalysisService, AiAnalysisProcessor],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
