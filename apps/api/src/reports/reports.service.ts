import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Crítico',
  MAJOR: 'Mayor',
  MINOR: 'Menor',
  SUGGESTION: 'Sugerencia',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  AI_PROCESSING: 'Análisis IA en proceso',
  AI_COMPLETE: 'IA completado',
  HUMAN_REVIEW: 'En revisión',
  OBSERVED: 'Observado',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateAdvanceReport(advanceId: string, res: Response) {
    const advance = await this.prisma.advance.findUnique({
      where: { id: advanceId },
      include: {
        student: { select: { name: true, email: true } },
        program: { select: { name: true } },
        template: { select: { name: true, version: true } },
        aiAnalysis: {
          include: {
            findings: { orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] },
          },
        },
        review: { include: { reviewer: { select: { name: true } } } },
      },
    });

    if (!advance) throw new NotFoundException('Avance no encontrado');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `reporte-${advanceId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fillColor('#185FA5')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('ThesisReview', 50, 50);

    doc
      .fillColor('#666')
      .fontSize(9)
      .font('Helvetica')
      .text('Sistema de revisión inteligente de avances académicos', 50, 72);

    doc.moveTo(50, 90).lineTo(545, 90).strokeColor('#185FA5').lineWidth(2).stroke();

    // ── Metadata ────────────────────────────────────────────────────────────
    let y = 105;
    doc.fillColor('#111').fontSize(14).font('Helvetica-Bold').text(advance.title, 50, y);
    y += 20;

    const meta = [
      ['Estudiante', advance.student?.name ?? '—'],
      ['Programa', advance.program?.name ?? '—'],
      ['Tipo', advance.advanceType],
      ['Versión', `v${advance.version}`],
      ['Estado', STATUS_LABEL[advance.status] ?? advance.status],
      ['Fecha de envío', new Date(advance.createdAt).toLocaleDateString('es-PE')],
      ['Documento patrón', advance.template ? `${advance.template.name} v${advance.template.version}` : '—'],
    ];

    doc.fontSize(9).font('Helvetica');
    for (const [label, value] of meta) {
      doc.fillColor('#888').text(label + ':', 50, y, { continued: true, width: 130 });
      doc.fillColor('#111').text(' ' + value);
      y += 14;
    }

    y += 6;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 14;

    // ── AI Analysis ─────────────────────────────────────────────────────────
    if (advance.aiAnalysis) {
      const ai = advance.aiAnalysis;

      doc.fillColor('#185FA5').fontSize(12).font('Helvetica-Bold').text('Evaluación IA', 50, y);
      y += 18;

      const maxGrade = Number(process.env.MAX_GRADE ?? 20);
      const scores = [
        ['Puntuación global', `${ai.overallScore.toFixed(1)} / 100`],
        ['Nota convertida', `${ai.gradeConverted.toFixed(1)} / ${maxGrade}`],
        ['Estructura', ai.structureScore != null ? `${ai.structureScore.toFixed(1)}` : '—'],
        ['Contenido', ai.contentScore != null ? `${ai.contentScore.toFixed(1)}` : '—'],
        ['Forma', ai.formScore != null ? `${ai.formScore.toFixed(1)}` : '—'],
        ['Originalidad', ai.originalityScore != null ? `${ai.originalityScore.toFixed(1)}` : '—'],
      ];

      doc.fontSize(9).font('Helvetica');
      const colW = 123;
      let col = 0;
      let rowY = y;
      for (const [label, value] of scores) {
        const x = 50 + col * colW;
        doc.fillColor('#888').text(label, x, rowY);
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(11).text(value, x, rowY + 11);
        doc.font('Helvetica').fontSize(9);
        col++;
        if (col === 4) {
          col = 0;
          rowY += 36;
        }
      }
      y = rowY + 36;

      if (ai.executiveSummary) {
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Oblique')
          .text(ai.executiveSummary, 50, y, { width: 495 });
        y += doc.heightOfString(ai.executiveSummary, { width: 495 }) + 10;
      }

      // Findings
      if (ai.findings.length > 0) {
        y += 4;
        doc.fillColor('#185FA5').fontSize(11).font('Helvetica-Bold').text('Hallazgos IA', 50, y);
        y += 16;

        const SEVERITY_COLOR: Record<string, string> = {
          CRITICAL: '#E24B4A',
          MAJOR: '#F59E0B',
          MINOR: '#3B82F6',
          SUGGESTION: '#6B7280',
        };

        for (const finding of ai.findings) {
          if (y > 720) { doc.addPage(); y = 50; }

          const color = SEVERITY_COLOR[finding.severity] ?? '#6B7280';
          doc.fillColor(color).fontSize(8).font('Helvetica-Bold')
            .text(`[${SEVERITY_LABEL[finding.severity] ?? finding.severity}]  ${finding.sectionRef}`, 50, y);
          y += 12;

          doc.fillColor('#111').fontSize(9).font('Helvetica')
            .text(finding.description, 62, y, { width: 483 });
          y += doc.heightOfString(finding.description, { width: 483 }) + 4;

          if (finding.correctionSteps) {
            doc.fillColor('#555').fontSize(8).font('Helvetica-Oblique')
              .text('Corrección: ' + finding.correctionSteps, 62, y, { width: 483 });
            y += doc.heightOfString('Corrección: ' + finding.correctionSteps, { width: 483 }) + 8;
          }
        }
      }

      y += 6;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
      y += 14;
    }

    // ── Human Review ─────────────────────────────────────────────────────────
    if (advance.review) {
      if (y > 680) { doc.addPage(); y = 50; }

      doc.fillColor('#185FA5').fontSize(12).font('Helvetica-Bold').text('Revisión humana', 50, y);
      y += 18;

      const reviewMeta = [
        ['Revisor', advance.review.reviewer?.name ?? '—'],
        ['Decisión', STATUS_LABEL[advance.review.status] ?? advance.review.status],
        ['Nota final', advance.review.finalGrade != null ? String(advance.review.finalGrade) : '—'],
        ['Fecha', advance.review.reviewedAt ? new Date(advance.review.reviewedAt).toLocaleDateString('es-PE') : '—'],
      ];

      doc.fontSize(9).font('Helvetica');
      for (const [label, value] of reviewMeta) {
        doc.fillColor('#888').text(label + ':', 50, y, { continued: true, width: 130 });
        doc.fillColor('#111').text(' ' + value);
        y += 14;
      }

      if (advance.review.humanComment) {
        y += 4;
        doc.fillColor('#374151').fontSize(9).font('Helvetica')
          .text('Comentario: ' + advance.review.humanComment, 50, y, { width: 495 });
        y += doc.heightOfString('Comentario: ' + advance.review.humanComment, { width: 495 }) + 8;
      }

      y += 6;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
      y += 14;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.fillColor('#AAA').fontSize(8).font('Helvetica')
      .text(
        `Generado el ${new Date().toLocaleString('es-PE')} · ThesisReview v2.0`,
        50,
        doc.page.height - 40,
        { width: 495, align: 'center' },
      );

    doc.end();
  }
}
