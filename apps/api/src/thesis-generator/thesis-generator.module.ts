import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { ThesisGeneratorController } from './thesis-generator.controller';
import { ThesisGeneratorService } from './thesis-generator.service';
import { ThesisGeneratorProcessor } from './thesis-generator.processor';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'thesis-generator' })],
  controllers: [ThesisGeneratorController],
  providers: [ThesisGeneratorService, ThesisGeneratorProcessor],
  exports: [ThesisGeneratorService],
})
export class ThesisGeneratorModule {}
