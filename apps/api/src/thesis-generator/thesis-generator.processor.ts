import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ThesisGeneratorService } from './thesis-generator.service';

@Processor('thesis-generator')
export class ThesisGeneratorProcessor extends WorkerHost {
  private readonly logger = new Logger(ThesisGeneratorProcessor.name);

  constructor(private service: ThesisGeneratorService) {
    super();
  }

  async process(job: Job<{ dto: string; userId: string }>): Promise<void> {
    if (job.name === 'generate') {
      this.logger.log(`Processing thesis generation job ${job.id}`);
      const { dto, userId } = job.data;
      const parsedDto = JSON.parse(dto);
      await this.service.generate(parsedDto, userId);
    }
  }
}
