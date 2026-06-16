import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async createRefreshToken(userId: string, meta?: { userAgent?: string; ip?: string }) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3_600_000);

    const existing = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing.length >= 5) {
      await this.prisma.refreshToken.update({
        where: { id: existing[0].id },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ip,
      },
    });

    return token;
  }

  async rotateRefreshToken(oldToken: string, meta?: { userAgent?: string; ip?: string }) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: oldToken },
      include: { user: { select: { id: true, email: true, role: true, name: true, programId: true } } },
    });

    if (!record) throw new UnauthorizedException('Refresh token inválido');
    if (record.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Token reusado — sesiones revocadas');
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const refreshToken = await this.createRefreshToken(record.userId, meta);
    const accessToken = this.jwt.sign({
      sub: record.user.id,
      email: record.user.email,
      role: record.user.role,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: record.user.id,
        email: record.user.email,
        name: record.user.name,
        role: record.user.role,
        programId: record.user.programId,
      },
    };
  }

  async revokeToken(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
