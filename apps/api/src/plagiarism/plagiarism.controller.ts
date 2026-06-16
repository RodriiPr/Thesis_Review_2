import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PlagiarismService } from './plagiarism.service';

@Controller('plagiarism')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlagiarismController {
  constructor(private plagiarismService: PlagiarismService) {}

  @Get('report/:advanceId')
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN', 'STUDENT')
  getReport(@Param('advanceId') advanceId: string) {
    return this.plagiarismService.getReport(advanceId);
  }

  @Post('analyze/:advanceId')
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN')
  analyze(
    @Param('advanceId') advanceId: string,
    @Body() body: { method?: 'embeddings' | 'copyleaks' },
  ) {
    return this.plagiarismService.analyze(advanceId, body.method ?? 'embeddings');
  }
}
