import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DocumentSchemaType } from '../../prisma';

interface PdfInput {
  title: string;
  authors: string;
  advisor: string;
  lineOfResearch: string;
  city: string;
  year: number;
  documentType: DocumentSchemaType;
  country: string;
  documentTypeLabel: string;
  introductionHtml: string;
  methodsHtml: string;
  resultsHtml: string;
  discussionHtml: string;
  conclusionsHtml: string;
  referencesHtml: string;
  annexesHtml: string;
  presidente: string;
  secretario: string;
  vocal: string;
  suplente: string;
  authorName: string;
  chapters?: string[];
}

export class PdfGenerator {
  private coverTemplate: HandlebarsTemplateDelegate;
  private juryTemplate: HandlebarsTemplateDelegate;
  private declarationTemplate: HandlebarsTemplateDelegate;
  private contentTemplate: HandlebarsTemplateDelegate;

  constructor() {
    // En el monorepo compilado, este archivo se ubica en:
    // dist/apps/api/src/thesis-generator/utils/pdf-generator.js
    // Los templates están en: dist/apps/api/src/thesis-generator/templates/
    const templatesDir = join(__dirname, '..', 'templates');

    this.coverTemplate = Handlebars.compile(
      readFileSync(join(templatesDir, 'cover.hbs'), 'utf-8'),
    );
    this.juryTemplate = Handlebars.compile(
      readFileSync(join(templatesDir, 'jury.hbs'), 'utf-8'),
    );
    this.declarationTemplate = Handlebars.compile(
      readFileSync(join(templatesDir, 'declaration.hbs'), 'utf-8'),
    );
    this.contentTemplate = Handlebars.compile(
      readFileSync(join(templatesDir, 'content.hbs'), 'utf-8'),
    );
  }

  async generate(input: PdfInput): Promise<Buffer> {
    const coverHtml = this.coverTemplate(input);
    const juryHtml = this.juryTemplate(input);
    const declarationHtml = this.declarationTemplate(input);

    const selected = input.chapters ?? ['introduction', 'bibliography', 'annexes'];
    const tocHtml = this.buildTableOfContents(selected);

    const chaptersHtml: string[] = [coverHtml, juryHtml, tocHtml];

    if (selected.includes('introduction')) {
      chaptersHtml.push(`<div class="page"><h1 class="chapter-title">CAPÍTULO I: INTRODUCCIÓN</h1>${input.introductionHtml}</div>`);
    }
    if (selected.includes('methods') && input.methodsHtml) {
      chaptersHtml.push(`<div class="page page-break"><h1 class="chapter-title">CAPÍTULO II: MÉTODOS</h1>${input.methodsHtml}</div>`);
    }
    if (selected.includes('results') && input.resultsHtml) {
      chaptersHtml.push(`<div class="page page-break"><h1 class="chapter-title">CAPÍTULO III: RESULTADOS</h1>${input.resultsHtml}</div>`);
    }
    if (selected.includes('discussion') && input.discussionHtml) {
      chaptersHtml.push(`<div class="page page-break"><h1 class="chapter-title">CAPÍTULO IV: DISCUSIÓN</h1>${input.discussionHtml}</div>`);
    }
    if (selected.includes('conclusions') && input.conclusionsHtml) {
      chaptersHtml.push(`<div class="page page-break"><h1 class="chapter-title">CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES</h1>${input.conclusionsHtml}</div>`);
    }
    if (selected.includes('bibliography')) {
      chaptersHtml.push(`<div class="page page-break"><h1 class="chapter-title" style="text-align:center;">REFERENCIAS BIBLIOGRÁFICAS</h1><br/>${input.referencesHtml}</div>`);
    }
    if (selected.includes('annexes')) {
      chaptersHtml.push(`<div class="page page-break"><h1 class="chapter-title" style="text-align:center;">ANEXOS</h1>${input.annexesHtml}</div>`);
    }

    chaptersHtml.push(declarationHtml);

    const bodyHtml = chaptersHtml.join('\n');
    const fullHtml = this.contentTemplate({ content: bodyHtml });

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'load' as any });

      const pdf = await page.pdf({
        format: 'Letter',
        margin: {
          top: '2.5cm',
          bottom: '2.5cm',
          left: '3cm',
          right: '2.5cm',
        },
        printBackground: true,
        displayHeaderFooter: false,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildTableOfContents(selected: string[]): string {
    const items: string[] = [
      '<div class="toc-item"><span>CARÁTULA</span><span class="toc-dots"></span><span class="toc-page">i</span></div>',
      '<div class="toc-item"><span>JURADO DICTAMINADOR</span><span class="toc-dots"></span><span class="toc-page">ii</span></div>',
      '<div class="toc-item"><span>ÍNDICE GENERAL</span><span class="toc-dots"></span><span class="toc-page">iii</span></div>',
    ];

    if (selected.includes('introduction')) {
      items.push('<div class="toc-item"><span>CAPÍTULO I: INTRODUCCIÓN</span><span class="toc-dots"></span><span class="toc-page">1</span></div>');
    }
    if (selected.includes('methods')) {
      items.push('<div class="toc-item"><span>CAPÍTULO II: MÉTODOS</span><span class="toc-dots"></span><span class="toc-page">2</span></div>');
    }
    if (selected.includes('results')) {
      items.push('<div class="toc-item"><span>CAPÍTULO III: RESULTADOS</span><span class="toc-dots"></span><span class="toc-page">3</span></div>');
    }
    if (selected.includes('discussion')) {
      items.push('<div class="toc-item"><span>CAPÍTULO IV: DISCUSIÓN</span><span class="toc-dots"></span><span class="toc-page">4</span></div>');
    }
    if (selected.includes('conclusions')) {
      items.push('<div class="toc-item"><span>CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES</span><span class="toc-dots"></span><span class="toc-page">5</span></div>');
    }
    if (selected.includes('bibliography')) {
      items.push('<div class="toc-item"><span>REFERENCIAS BIBLIOGRÁFICAS</span><span class="toc-dots"></span><span class="toc-page">R-1</span></div>');
    }
    if (selected.includes('annexes')) {
      items.push('<div class="toc-item"><span>ANEXOS</span><span class="toc-dots"></span><span class="toc-page">A-1</span></div>');
      items.push('<div class="toc-item toc-indent-1"><span>Anexo A: Árbol de Problemas</span><span class="toc-dots"></span><span class="toc-page">A-2</span></div>');
      items.push('<div class="toc-item toc-indent-1"><span>Anexo B: Árbol de Objetivos</span><span class="toc-dots"></span><span class="toc-page">A-3</span></div>');
    }
    items.push('<div class="toc-item"><span>DECLARACIÓN JURADA</span><span class="toc-dots"></span><span class="toc-page">D-1</span></div>');

    return `<div class="page">
      <h1 class="index-title">ÍNDICE GENERAL</h1>
      ${items.join('\n')}
    </div>`;
  }
}
