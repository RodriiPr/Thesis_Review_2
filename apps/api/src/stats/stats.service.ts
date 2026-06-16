import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOW_COMPLIANCE_THRESHOLD = Number(process.env.LOW_COMPLIANCE_ALERT ?? 65);

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const totalAdvances = await this.prisma.advance.count();
    const totalReviews = await this.prisma.review.count();

    const humanAvg = await this.prisma.review.aggregate({
      _avg: { finalGrade: true },
    });

    const aiAvg = await this.prisma.aIAnalysis.aggregate({
      _avg: { overallScore: true },
    });

    const acceptedFindings = await this.prisma.aIFinding.count({ where: { humanAccepted: true } });
    const totalFindings = await this.prisma.aIFinding.count();

    const byStatus: Array<{ status: string; count: string }> = await this.prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM "advances"
      GROUP BY status
    `;

    return {
      totals: { advances: totalAdvances, reviews: totalReviews },
      averages: {
        plagiarism: 0,
        aiOverall: Number(aiAvg._avg?.overallScore ?? 0),
        humanScore: Number(humanAvg._avg?.finalGrade ?? 0),
      },
      concordance: {
        accepted: acceptedFindings,
        modified: 0,
        totalFindings,
        rate: totalFindings > 0 ? acceptedFindings / totalFindings : 0,
      },
      advancesByStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    };
  }

  async getDashboard() {
    const [
      totalAdvances,
      aiAvg,
      humanAvg,
      acceptedFindings,
      totalFindings,
      byStatusRaw,
      lowComplianceCount,
    ] = await Promise.all([
      this.prisma.advance.count(),
      this.prisma.aIAnalysis.aggregate({ _avg: { gradeConverted: true, overallScore: true } }),
      this.prisma.review.aggregate({ _avg: { finalGrade: true } }),
      this.prisma.aIFinding.count({ where: { humanAccepted: true } }),
      this.prisma.aIFinding.count(),
      this.prisma.$queryRaw<Array<{ status: string; count: string }>>`
        SELECT status, COUNT(*) as count FROM "advances" GROUP BY status
      `,
      this.prisma.aIAnalysis.count({
        where: { overallScore: { lt: LOW_COMPLIANCE_THRESHOLD } },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRaw) {
      byStatus[row.status] = Number(row.count);
    }

    const pendingCount = (byStatus['PENDING'] ?? 0) + (byStatus['AI_PROCESSING'] ?? 0);
    const aiConcordance =
      totalFindings > 0 ? Math.round((acceptedFindings / totalFindings) * 100) : 0;

    const maxGrade = Number(process.env.MAX_GRADE ?? 20);
    const averageAIGrade = Number(
      (aiAvg._avg?.gradeConverted ?? (((aiAvg._avg?.overallScore ?? 0) / 100) * maxGrade)).toFixed(1),
    );

    return {
      totalAdvances,
      pendingCount,
      byStatus,
      aiConcordance,
      averageAIGrade,
      averageHumanGrade: Number((humanAvg._avg?.finalGrade ?? 0).toFixed(1)),
      lowComplianceCount,
    };
  }
}
