import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(
    user: { id: string; email: string; name: string; role: string; programId: string | null },
    meta?: { userAgent?: string; ip?: string },
  ) {
    const refreshToken = await this.refreshTokenService.createRefreshToken(user.id, meta);
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        programId: user.programId,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'Si el email existe, recibirás un enlace.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3_600_000);

    await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, token, expiresAt: expiry },
      update: { token, expiresAt: expiry },
    });

    return { message: 'Si el email existe, recibirás un enlace.' };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        programId: true,
        program: { select: { name: true } },
      },
    });
  }
}
