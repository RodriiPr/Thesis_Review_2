import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ReferencesService } from './references.service';

@Controller('references')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferencesController {
  constructor(private referencesService: ReferencesService) {}

  @Get('report/:advanceId')
  getReport(@Param('advanceId') advanceId: string) {
    return this.referencesService.getReport(advanceId);
  }

  @Post('analyze/:advanceId')
  analyze(@Param('advanceId') advanceId: string) {
    return this.referencesService.analyze(advanceId);
  }
}
