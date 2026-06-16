import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SchemesService } from './schemes.service';
import { CreateSchemaDto, UpdateSchemaDto } from './dto/schema.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('schemes')
@UseGuards(JwtAuthGuard)
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Post()
  create(@Body() createSchemaDto: CreateSchemaDto, @GetUser('id') userId: string) {
    return this.schemesService.create(createSchemaDto, userId);
  }

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractStructure(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    const fileType = file.mimetype === 'application/pdf' ? 'pdf' : 'docx';
    if (file.mimetype !== 'application/pdf' && 
        file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      throw new BadRequestException('Formato de archivo no soportado (solo PDF/DOCX)');
    }
    return this.schemesService.extractStructure(file.buffer, fileType);
  }

  @Get()
  findAll(@GetUser('id') userId: string) {
    return this.schemesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schemesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchemaDto: UpdateSchemaDto) {
    return this.schemesService.update(id, updateSchemaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schemesService.remove(id);
  }
}
