import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('advance/:advanceId')
  generateAdvanceReport(
    @Param('advanceId') advanceId: string,
    @Res() res: Response,
  ) {
    return this.reportsService.generateAdvanceReport(advanceId, res);
  }
}
