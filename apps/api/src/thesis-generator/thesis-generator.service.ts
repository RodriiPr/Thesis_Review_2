import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContentGenerator, ThesisInput } from './utils/content-generator';
import { PdfGenerator } from './utils/pdf-generator';
import { generateDocx } from './utils/docx-generator';
import { GenerateThesisDto } from './dto/generate-thesis.dto';
import { DocumentSchemaType } from '../prisma';

@Injectable()
export class ThesisGeneratorService {
  private readonly logger = new Logger(ThesisGeneratorService.name);
  private contentGenerator: ContentGenerator;
  private pdfGenerator: PdfGenerator;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {
    this.contentGenerator = new ContentGenerator(process.env.DEEPSEEK_API_KEY);
    this.pdfGenerator = new PdfGenerator();
  }

  async generate(dto: GenerateThesisDto, userId: string): Promise<string> {
    const doc = await this.prisma.thesisDocument.create({
      data: {
        title: dto.title,
        authors: dto.authors,
        advisor: dto.advisor,
        lineOfResearch: dto.lineOfResearch,
        city: dto.city ?? 'Lima',
        year: dto.year,
        documentType: dto.documentType,
        status: 'GENERATING',
        outputFormats: dto.outputFormats ?? ['PDF'],
        userId,
        schemaId: dto.schemaId,
      },
    });

    let structure = null;
    if (dto.schemaId) {
      const schema = await this.prisma.documentSchema.findUnique({
        where: { id: dto.schemaId },
      });
      if (schema) {
        structure = schema.structure;
      }
    }

    const chapters = dto.chapters ?? ['introduction', 'bibliography', 'annexes'];

    const input: ThesisInput = {
      title: dto.title,
      authors: dto.authors,
      advisor: dto.advisor,
      lineOfResearch: dto.lineOfResearch,
      city: dto.city ?? 'Lima',
      year: dto.year,
      documentType: dto.documentType,
      chapters,
      structure,
    };

    try {
      this.logger.log(`Generating content for thesis ${doc.id}...`);
      const content = await this.contentGenerator.generate(input);

      const formats = dto.outputFormats ?? ['PDF'];
      const pdfKey = `thesis-generated/${doc.id}/documento.pdf`;
      const docxKey = `thesis-generated/${doc.id}/documento.docx`;

      if (formats.includes('PDF')) {
        this.logger.log(`Generating PDF for thesis ${doc.id}...`);
        const pdfBuffer = await this.pdfGenerator.generate({
          title: dto.title,
          authors: dto.authors.join(', '),
          advisor: dto.advisor,
          lineOfResearch: dto.lineOfResearch,
          city: dto.city ?? 'Lima',
          year: dto.year,
          documentType: dto.documentType,
          country: 'Perú',
          documentTypeLabel:
            dto.documentType === DocumentSchemaType.THESIS_PROJECT
              ? 'PROYECTO DE TESIS'
              : 'INFORME DE PROYECTO DE TESIS',
          introductionHtml: content.introduction,
          methodsHtml: content.methods,
          resultsHtml: content.results,
          discussionHtml: content.discussion,
          conclusionsHtml: content.conclusions,
          referencesHtml: content.references,
          annexesHtml: content.annexes,
          presidente: '',
          secretario: '',
          vocal: '',
          suplente: '',
          authorName: dto.authors[0] ?? '',
          chapters,
        });

        await this.storage.upload(pdfKey, pdfBuffer, 'application/pdf');
        this.logger.log(`PDF uploaded for thesis ${doc.id}`);
      }

      if (formats.includes('DOCX')) {
        this.logger.log(`Generating DOCX for thesis ${doc.id}...`);
        const docxBuffer = await generateDocx({
          title: dto.title,
          authors: dto.authors,
          advisor: dto.advisor,
          lineOfResearch: dto.lineOfResearch,
          city: dto.city ?? 'Lima',
          year: dto.year,
          introductionHtml: content.introduction,
          methodsHtml: content.methods,
          resultsHtml: content.results,
          discussionHtml: content.discussion,
          conclusionsHtml: content.conclusions,
          referencesHtml: content.references,
          annexesHtml: content.annexes,
          chapters,
        });

        await this.storage.upload(docxKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        this.logger.log(`DOCX uploaded for thesis ${doc.id}`);
      }

      await this.prisma.thesisDocument.update({
        where: { id: doc.id },
        data: {
          status: 'COMPLETED',
          pdfKey: formats.includes('PDF') ? pdfKey : null,
          docxKey: formats.includes('DOCX') ? docxKey : null,
          metadata: { generatedAt: new Date().toISOString() },
        },
      });

      this.logger.log(`Thesis ${doc.id} completed successfully`);
      return doc.id;
    } catch (err) {
      this.logger.error(`Thesis generation failed for ${doc.id}`, err);
      await this.prisma.thesisDocument.update({
        where: { id: doc.id },
        data: { status: 'FAILED', metadata: { error: (err as Error).message } },
      });
      throw err;
    }
  }

  async getStatus(id: string): Promise<any> {
    return this.prisma.thesisDocument.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, metadata: true, createdAt: true, updatedAt: true },
    });
  }

  async getDownloadUrl(id: string, format: 'pdf' | 'docx'): Promise<string> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${apiUrl}/api/v1/thesis-generator/${id}/download/${format}`;
  }

  async getFile(id: string, format: 'pdf' | 'docx'): Promise<{ buffer: Buffer; contentType: string }> {
    const doc = await this.prisma.thesisDocument.findUniqueOrThrow({ where: { id } });
    const key = format === 'pdf' ? doc.pdfKey : doc.docxKey;
    if (!key) throw new Error(`Formato ${format} no disponible`);
    const buffer = await this.storage.download(key);
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return { buffer, contentType };
  }
}
