import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { OrcidService } from './orcid.service';

@Controller('orcid')
export class OrcidController {
  constructor(
    private orcidService: OrcidService,
    private prisma: PrismaService,
  ) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard)
  connect(@Req() req: { user: { id: string } }) {
    const url = this.orcidService.getAuthorizationUrl(req.user.id);
    return { url };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.orcidService.handleOAuthCallback(code, state);
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/orcid/success?orcid=${result.orcidId}&name=${encodeURIComponent(result.name ?? '')}`,
      );
    } catch {
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/orcid/error`);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: { user: { id: string } }) {
    const profile = await this.orcidService.getProfile(req.user.id);
    if (!profile) return { connected: false };
    return { connected: true, profile };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sync(@Req() req: { user: { id: string } }) {
    const profile = await this.orcidService.getProfile(req.user.id);
    if (!profile?.id) throw new UnauthorizedException('ORCID no conectado');
    await this.orcidService.syncPublications(profile.id);
    return { synced: true };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: { user: { id: string } }) {
    await this.orcidService.disconnect(req.user.id);
  }

  @Get('publications')
  @UseGuards(JwtAuthGuard)
  async getPublications(@Req() req: { user: { id: string } }) {
    const profile = await this.orcidService.getProfile(req.user.id);
    if (!profile?.id) return [];
    return this.orcidService.getPublications(profile.id);
  }

  @Get('match-score/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN')
  async getMatchScore(
    @Param('studentId') studentId: string,
    @Req() req: { user: { id: string } },
  ) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      include: { advances: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    if (!student) throw new UnauthorizedException('Estudiante no encontrado');

    const thesisTitle = student.advances?.[0]?.title ?? '';
    if (!thesisTitle) {
      return { score: 0, matchedPublications: [], message: 'El estudiante no tiene avances registrados' };
    }

    return this.orcidService.getAdvisorThesisMatchScore(req.user.id, thesisTitle);
  }
}
