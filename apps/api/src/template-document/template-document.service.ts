import { Injectable, BadRequestException } from '@nestjs/common';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

import { StorageService } from '../storage/storage.service';
import { GenerateFromTemplateDto } from './dto/generate-from-template.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TemplateDocumentService {
  constructor(private readonly storageService: StorageService) {}

  async generate(templateBuffer: Buffer, data: GenerateFromTemplateDto): Promise<{ url: string; id: string }> {
    try {
      console.log('--- DEBUG GENERATION START ---');
      console.log('Data received:', JSON.stringify(data, null, 2));
      console.log('Template buffer size:', templateBuffer.length);

      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
      });

      const authorsText = Array.isArray(data.authors) ? data.authors.join(', ') : data.authors;
      
      doc.render({
        ...data,
        authors: authorsText,
      });

      const out = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      console.log('Generated buffer size:', out.length);
      if (out.length === templateBuffer.length) {
        console.warn('WARNING: Generated file size is identical to template. No replacements were made.');
      }

      const fileName = `generated-docs/${uuidv4()}.docx`;
      await this.storageService.upload(fileName, out, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const url = await this.storageService.getPresignedUrl(fileName);
      console.log('Final URL generated:', url);
      console.log('--- DEBUG GENERATION END ---');

      return { url, id: fileName };
    } catch (error) {
      console.error('CRITICAL ERROR during generation:', error);
      throw new BadRequestException(`Error generating document: ${error.message}`);
    }
  }

  async getDownloadUrl(id: string): Promise<string> {
    return this.storageService.getPresignedUrl(id);
  }
}
