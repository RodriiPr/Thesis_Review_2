import { Module } from '@nestjs/common';
import { TemplateDocumentController } from './template-document.controller';
import { TemplateDocumentService } from './template-document.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  controllers: [TemplateDocumentController],
  providers: [TemplateDocumentService],
  imports: [StorageModule],
})
export class TemplateDocumentModule {}
