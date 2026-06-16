import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from 'docx';

interface DocxInput {
  title: string;
  authors: string[];
  advisor: string;
  lineOfResearch: string;
  city: string;
  year: number;
  introductionHtml: string;
  methodsHtml: string;
  resultsHtml: string;
  discussionHtml: string;
  conclusionsHtml: string;
  referencesHtml: string;
  annexesHtml: string;
  chapters?: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToParagraphs(html: string): Paragraph[] {
  const text = stripHtml(html);
  const sentences = text.split(/(?<=\.)\s+/);
  const paragraphs: Paragraph[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > 2000 || sentence.includes(':\n')) {
      if (current) {
        paragraphs.push(
          new Paragraph({
            spacing: { line: 360, after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: current.trim(), size: 24, font: 'Arial Narrow' })],
          }),
        );
      }
      current = sentence + ' ';
    } else {
      current += sentence + ' ';
    }
  }
  if (current) {
    paragraphs.push(
      new Paragraph({
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: current.trim(), size: 24, font: 'Arial Narrow' })],
      }),
    );
  }

  return paragraphs;
}

const LETTER_WIDTH = 12240; // 8.5in in twips
const LETTER_HEIGHT = 15840; // 11in in twips

function addChapterParagraphs(children: Paragraph[], title: string, html: string) {
  if (!html) return;
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 28,
          font: 'Arial Narrow',
        }),
      ],
    }),
  );
  children.push(...htmlToParagraphs(html));
}

export async function generateDocx(input: DocxInput): Promise<Buffer> {
  const selected = input.chapters ?? ['introduction', 'bibliography', 'annexes'];

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000 },
      children: [
        new TextRun({
          text: input.title,
          bold: true,
          size: 28,
          font: 'Arial Narrow',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: input.authors.join(', '),
          size: 24,
          font: 'Arial Narrow',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `Asesor: ${input.advisor}`,
          size: 24,
          font: 'Arial Narrow',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: input.lineOfResearch,
          size: 24,
          font: 'Arial Narrow',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `${input.city}, ${input.year}`,
          size: 24,
          font: 'Arial Narrow',
        }),
      ],
    }),
  ];

  addChapterParagraphs(children, 'CAPÍTULO I: INTRODUCCIÓN', input.introductionHtml);
  addChapterParagraphs(children, 'CAPÍTULO II: MÉTODOS', input.methodsHtml);
  addChapterParagraphs(children, 'CAPÍTULO III: RESULTADOS', input.resultsHtml);
  addChapterParagraphs(children, 'CAPÍTULO IV: DISCUSIÓN', input.discussionHtml);
  addChapterParagraphs(children, 'CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES', input.conclusionsHtml);

  if (input.referencesHtml) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: 'REFERENCIAS BIBLIOGRÁFICAS',
            bold: true,
            size: 28,
            font: 'Arial Narrow',
          }),
        ],
      }),
    );
    children.push(...htmlToParagraphs(input.referencesHtml));
  }

  if (input.annexesHtml) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: 'ANEXOS',
            bold: true,
            size: 28,
            font: 'Arial Narrow',
          }),
        ],
      }),
    );
    children.push(...htmlToParagraphs(input.annexesHtml));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial Narrow', size: 24, color: '000000' },
          paragraph: {
            spacing: { line: 360 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: LETTER_WIDTH, height: LETTER_HEIGHT },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
