import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, Body, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
}
