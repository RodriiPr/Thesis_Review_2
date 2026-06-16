import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PipelineController {
  constructor(
    @InjectQueue('ai-analysis') private aiQueue: Queue,
  ) {}

  @Get('status')
  async getStatus(@Request() req: { user: { id: string } }) {
    const [counts, jobs] = await Promise.all([
      this.aiQueue.getJobCounts(),
      this.aiQueue.getJobs(['active', 'waiting', 'completed', 'failed'], 0, 10),
    ]);

    const recentJobs = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status: await job.getState(),
        progress: job.progress,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
      })),
    );

    return {
      queue: 'ai-analysis',
      counts,
      isPaused: await this.aiQueue.isPaused(),
      recentJobs,
    };
  }
}
