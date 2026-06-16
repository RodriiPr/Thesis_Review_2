import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('fine-tuning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FineTuningController {
  constructor(private prisma: PrismaService) {}

  @Post('findings/:id/feedback')
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN')
  async feedback(
    @Param('id') id: string,
    @Body() body: { outcome: string; humanComment?: string },
  ) {
    const accepted = body.outcome === 'ACCEPTED' || body.outcome === 'ACCEPTED_WITH_EDIT';
    await this.prisma.aIFinding.update({
      where: { id },
      data: {
        humanAccepted: accepted,
        humanComment: body.humanComment ?? body.outcome,
      },
    });
    return { ok: true };
  }
}
