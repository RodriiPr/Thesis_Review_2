import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PipelineController } from './pipeline.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'ai-analysis' })],
  controllers: [PipelineController],
})
export class PipelineModule {}
