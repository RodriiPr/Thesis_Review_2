import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdvancesService } from './advances.service';

@Controller('advances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancesController {
  constructor(private advancesService: AdvancesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 52_428_800 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { programId: string; templateId: string; advanceType: string },
    @Request() req: { user: { id: string; role: string } },
  ) {
    if (!body.programId || !body.templateId || !body.advanceType) {
      throw new BadRequestException('programId, templateId y advanceType son requeridos');
    }
    const studentId = req.user.role === 'STUDENT' ? req.user.id : req.user.id;
    return this.advancesService.upload({
      studentId,
      programId: body.programId,
      templateId: body.templateId,
      advanceType: body.advanceType,
      file,
    });
  }

  @Get('mine')
  @Roles('STUDENT')
  listMine(@Request() req: { user: { id: string } }) {
    return this.advancesService.listForStudent(req.user.id);
  }

  @Get('versions/:advanceType')
  @Roles('STUDENT')
  versionHistory(
    @Param('advanceType') advanceType: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.advancesService.getVersionHistory(req.user.id, advanceType);
  }

  @Get()
  async list(
    @Request() req: { user: { id: string; role: string } },
    @Query('status') status?: string,
    @Query('programId') programId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    if (req.user.role === 'STUDENT') {
      const advances = await this.advancesService.listForStudent(req.user.id);
      return {
        advances,
        total: advances.length,
        page: 1,
        pageSize: advances.length,
        totalPages: 1,
      };
    }
    if (req.user.role === 'ADVISOR') {
      return this.advancesService.listForAdvisor(req.user.id, {
        status,
        programId,
        page: Number(page),
        pageSize: Number(pageSize),
      });
    }
    return this.advancesService.listAll({
      status,
      programId,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id/preview-url')
  previewUrl(@Param('id') id: string) {
    return this.advancesService.getPreviewUrl(id);
  }

  @Get(':id/preview-content')
  async previewContent(@Param('id') id: string) {
    return this.advancesService.getPreviewContent(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, contentType, filename } = await this.advancesService.downloadFile(id);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: { user: { id: string; role: string } }) {
    return this.advancesService.getAdvanceDetail(id, req.user.id, req.user.role);
  }
}
