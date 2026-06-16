import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  overview() {
    return this.statsService.getOverview();
  }

  @Get('dashboard')
  dashboard() {
    return this.statsService.getDashboard();
  }
}
