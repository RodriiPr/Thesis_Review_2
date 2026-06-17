import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, Body, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TemplateDocumentService } from './template-document.service';
import { GenerateFromTemplateDto } from './dto/generate-from-template.dto';

@Controller('template-document')
export class TemplateDocumentController {
  constructor(private readonly templateDocumentService: TemplateDocumentService) {}

  @Post('generate')
  @UseInterceptors(FileInterceptor('file'))
  async generate(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: GenerateFromTemplateDto,
  ) {
    if (!file) {
      throw new Error('Template file is required');
    }
    return this.templateDocumentService.generate(file.buffer, data);
  }

  @Get(':id/download')
  async download(@Param('id') id: string) {
    return { url: await this.templateDocumentService.getDownloadUrl(id) };
  }

  @Get(':id/preview')
  async preview(@Param('id') id: string, @Res() res: Response) {
    const html = await this.templateDocumentService.getPreviewHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
