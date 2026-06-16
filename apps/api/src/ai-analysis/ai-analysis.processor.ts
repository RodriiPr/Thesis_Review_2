import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiAnalysisService } from './ai-analysis.service';

@Processor('ai-analysis')
export class AiAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AiAnalysisProcessor.name);

  constructor(private aiAnalysisService: AiAnalysisService) {
    super();
  }

  async process(job: Job<{ advanceId: string }>): Promise<void> {
    if (job.name === 'analyze') {
      this.logger.log(`Processing AI job ${job.id} for advance ${job.data.advanceId}`);
      await this.aiAnalysisService.runAnalysis(job.data.advanceId);
    }
  }
}
