import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgramsService } from './programs.service';

@Controller('programs')
@UseGuards(JwtAuthGuard)
export class ProgramsController {
  constructor(private programsService: ProgramsService) {}

  @Get()
  findAll() {
    return this.programsService.findAll();
  }
}
