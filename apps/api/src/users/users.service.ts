import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

type OrcidExpandedResult = {
  'orcid-id'?: string;
  'given-names'?: string;
  'family-names'?: string;
  email?: string[];
};

type OrcidSearchResponse = {
  'expanded-result'?: OrcidExpandedResult[];
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async listAll(filters: { role?: string; programId?: string }) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters.role ? { role: filters.role as any } : {}),
        ...(filters.programId ? { programId: filters.programId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        orcidManual: true,
        role: true,
        programId: true,
        program: { select: { name: true } },
        orcidProfile: { select: { orcidId: true } },
        createdAt: true,
        _count: { select: { advances: true, reviews: true } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    const enrichedUsers: Array<Omit<(typeof users)[number], 'orcidManual' | 'orcidProfile'> & { orcid: string | null }> = [];
    for (const user of users) {
      const oauthOrcid = user.orcidProfile?.orcidId ?? null;
      const orcid = oauthOrcid ?? await this.resolveOrcid(user.name, user.email, user.orcidManual);
      enrichedUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        programId: user.programId,
        program: user.program,
        createdAt: user.createdAt,
        _count: user._count,
        orcid,
      });
    }

    return enrichedUsers;
  }

  async create(data: { name: string; email: string; password: string; role: string; programId?: string }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role as any,
        programId: data.programId ?? null,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async update(id: string, data: { name?: string; role?: string; programId?: string; password?: string; orcidManual?: string | null }) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.programId !== undefined) updateData.programId = data.programId ?? null;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);
    if (data.orcidManual !== undefined) {
      if (data.orcidManual === null || data.orcidManual.trim() === '') {
        updateData.orcidManual = null;
      } else {
        const normalized = this.normalizeOrcid(data.orcidManual);
        if (!this.isValidOrcid(normalized)) {
          throw new BadRequestException('Codigo ORCID invalido');
        }
        updateData.orcidManual = normalized;
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, programId: true, orcidManual: true },
    });
  }

  async remove(id: string) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  private async resolveOrcid(name: string, email: string, orcidManual: string | null): Promise<string | null> {
    if (orcidManual && this.isValidOrcid(orcidManual)) {
      return this.normalizeOrcid(orcidManual);
    }

    const domain = this.getEmailDomain(email);
    if (!domain) return null;

    const familyName = this.getFamilyNameForSearch(name);
    if (!familyName) return null;

    const query = `family-name:${familyName} AND email:*@${domain}`;
    const url = `https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(query)}`;

    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;

      const payload = (await res.json()) as OrcidSearchResponse;
      const records = payload['expanded-result'] ?? [];
      const matched = records.find((candidate) => this.matchesUserByNameAndDomain(candidate, name, domain));
      const orcid = matched?.['orcid-id'];

      if (!orcid || !this.isValidOrcid(orcid)) return null;
      return this.normalizeOrcid(orcid);
    } catch (error) {
      this.logger.warn(`No se pudo validar ORCID para ${email}: ${(error as Error).message}`);
      return null;
    }
  }

  private getEmailDomain(email: string): string | null {
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[1]) return null;
    return parts[1].trim().toLowerCase();
  }

  private getFamilyNameForSearch(name: string): string | null {
    const normalized = this.normalizeText(name);
    if (!normalized) return null;

    if (normalized.includes(',')) {
      const [lastNames] = normalized.split(',');
      const candidate = lastNames?.trim().split(' ').filter(Boolean).pop();
      return candidate?.toLowerCase() ?? null;
    }

    const tokens = normalized.split(' ').filter(Boolean);
    if (tokens.length === 0) return null;
    return tokens[tokens.length - 1].toLowerCase();
  }

  private matchesUserByNameAndDomain(candidate: OrcidExpandedResult, name: string, domain: string): boolean {
    const candidateEmails = candidate.email ?? [];
    const hasDomain = candidateEmails.some((email) => email.toLowerCase().endsWith(`@${domain}`));
    if (!hasDomain) return false;

    const fullCandidateName = this.normalizeText(`${candidate['given-names'] ?? ''} ${candidate['family-names'] ?? ''}`);
    const userTokens = this.normalizeText(name).split(' ').filter(Boolean);
    if (userTokens.length === 0) return false;

    const tokenMatches = userTokens.filter((token) => fullCandidateName.includes(token)).length;
    const requiredMatches = Math.min(2, userTokens.length);
    return tokenMatches >= requiredMatches;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeOrcid(value: string): string {
    const cleaned = value
      .trim()
      .replace(/^https?:\/\/orcid\.org\//i, '')
      .replace(/\s+/g, '')
      .toUpperCase();

    if (/^\d{15}[\dX]$/.test(cleaned)) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
    }

    return cleaned;
  }

  private isValidOrcid(orcid: string): boolean {
    const compact = orcid.replace(/-/g, '').toUpperCase();
    if (!/^\d{15}[\dX]$/.test(compact)) return false;

    let total = 0;
    for (let i = 0; i < 15; i++) {
      total = (total + Number(compact[i])) * 2;
    }
    const remainder = total % 11;
    const result = (12 - remainder) % 11;
    const checkDigit = result === 10 ? 'X' : String(result);
    return compact[15] === checkDigit;
  }
}
