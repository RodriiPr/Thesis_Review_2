import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ORCID_TOKEN_URL = `${process.env.ORCID_API_BASE ?? 'https://orcid.org'}/oauth/token`;
const ORCID_AUTH_URL = `${process.env.ORCID_API_BASE ?? 'https://orcid.org'}/oauth/authorize`;
const ORCID_PUB_API = 'https://pub.orcid.org/v3.0';
const ORCID_MEMBER_API = 'https://api.orcid.org/v3.0';

interface OrcidTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  orcid: string;
  name?: string;
}

interface OrcidWork {
  'put-code': number;
  title?: { title?: { value?: string } };
  'journal-title'?: { value?: string };
  'publication-date'?: {
    year?: { value?: string };
    month?: { value?: string };
    day?: { value?: string };
  };
  'external-ids'?: {
    'external-id'?: Array<{
      'external-id-type': string;
      'external-id-value': string;
      'external-id-url'?: { value?: string };
    }>;
  };
  'short-description'?: string;
  url?: { value?: string };
  contributors?: {
    contributor?: Array<{
      'credit-name'?: { value?: string };
      'contributor-attributes'?: {
        'contributor-sequence'?: string;
        'contributor-role'?: string;
      };
    }>;
  };
}

@Injectable()
export class OrcidService {
  private readonly logger = new Logger(OrcidService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private prisma: PrismaService) {
    this.clientId = process.env.ORCID_CLIENT_ID ?? '';
    this.clientSecret = process.env.ORCID_CLIENT_SECRET ?? '';
    this.redirectUri = process.env.ORCID_REDIRECT_URI ?? '';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('ORCID_CLIENT_ID / ORCID_CLIENT_SECRET no configurados');
    }
  }

  getAuthorizationUrl(userId: string): string {
    const state = this.encodeState(userId);
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: '/authenticate /read-limited',
      redirect_uri: this.redirectUri,
      state,
    });
    return `${ORCID_AUTH_URL}?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ profileId: string; orcidId: string; name?: string }> {
    const userId = this.decodeState(state);
    if (!userId) {
      throw new UnauthorizedException('Estado invalido o expirado');
    }

    const tokenData = await this.exchangeCodeForToken(code);

    const orcidRecord = await this.fetchOrcidRecord(tokenData.orcid, tokenData.access_token);

    const upserted = await this.prisma.orcidProfile.upsert({
      where: { userId },
      create: {
        userId,
        orcidId: tokenData.orcid,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      update: {
        orcidId: tokenData.orcid,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    await this.syncPublications(upserted.id);

    return {
      profileId: upserted.id,
      orcidId: tokenData.orcid,
      name: tokenData.name ?? orcidRecord.name,
    };
  }

  async syncPublications(orcidProfileId: string): Promise<void> {
    const profile = await this.prisma.orcidProfile.findUnique({
      where: { id: orcidProfileId },
    });
    if (!profile) throw new BadRequestException('Perfil ORCID no encontrado');

    const token = await this.getValidAccessToken(profile);

    const works = await this.fetchWorks(profile.orcidId, token);

    const existing = await this.prisma.orcidPublication.findMany({
      where: { orcidProfileId },
      select: { putCode: true },
    });
    const existingPutCodes = new Set(existing.map((p) => p.putCode));

    const toCreate = works.filter((w) => !existingPutCodes.has(w['put-code']));

    if (toCreate.length > 0) {
      const data = toCreate.map((w) => ({
        orcidProfileId,
        putCode: w['put-code'],
        title: w.title?.title?.value ?? 'Untitled',
        doi: this.extractDoi(w),
        journal: w['journal-title']?.value ?? null,
        year: w['publication-date']?.year?.value ? Number(w['publication-date'].year.value) : null,
        authors: this.extractAuthors(w),
        abstract: w['short-description'] ?? null,
        url: w.url?.value ?? null,
      }));

      for (const pub of data) {
        await this.prisma.orcidPublication.upsert({
          where: { orcidProfileId_putCode: { orcidProfileId, putCode: pub.putCode } },
          create: pub,
          update: pub,
        });
      }
    }

    this.logger.log(`Sincronizadas ${toCreate.length} publicaciones nuevas para ORCID ${profile.orcidId}`);
  }

  async getPublications(orcidProfileId: string) {
    return this.prisma.orcidPublication.findMany({
      where: { orcidProfileId },
      orderBy: { year: 'desc' },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.orcidProfile.findUnique({
      where: { userId },
      include: { publications: { orderBy: { year: 'desc' } } },
    });
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.orcidPublication.deleteMany({
      where: { orcidProfile: { userId } },
    });
    await this.prisma.orcidProfile.delete({ where: { userId } });
  }

  async getAdvisorThesisMatchScore(
    advisorId: string,
    thesisTitle: string,
  ): Promise<{
    score: number;
    matchedPublications: Array<{ title: string; year: number | null; doi: string | null; similarity: number }>;
  }> {
    const profile = await this.prisma.orcidProfile.findUnique({
      where: { userId: advisorId },
      include: { publications: true },
    });
    if (!profile || profile.publications.length === 0) {
      return { score: 0, matchedPublications: [] };
    }

    const thesisTokens = this.tokenize(thesisTitle);
    const matches: Array<{ title: string; year: number | null; doi: string | null; similarity: number }> = [];
    let totalSimilarity = 0;

    for (const pub of profile.publications) {
      const pubTokens = this.tokenize(pub.title);
      const similarity = this.jaccardSimilarity(thesisTokens, pubTokens);
      if (similarity > 0) {
        matches.push({ title: pub.title, year: pub.year, doi: pub.doi, similarity });
        totalSimilarity += similarity;
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    const topMatches = matches.slice(0, 10);
    const score = topMatches.length > 0
      ? Math.round((topMatches.reduce((s, m) => s + m.similarity, 0) / topMatches.length) * 100)
      : 0;

    return { score, matchedPublications: topMatches };
  }

  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-záéíóúñü0-9\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2),
    );
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  private async exchangeCodeForToken(code: string): Promise<OrcidTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });

    const res = await fetch(ORCID_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`ORCID token exchange failed: ${text}`);
      throw new BadRequestException('No se pudo intercambiar el codigo ORCID');
    }

    return res.json() as Promise<OrcidTokenResponse>;
  }

  private async fetchOrcidRecord(orcidId: string, token: string): Promise<{ name?: string }> {
    try {
      const res = await fetch(`${ORCID_MEMBER_API}/${orcidId}/record`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) return {};
      const data = (await res.json()) as { person?: { name?: { 'given-names'?: { value?: string }; 'family-name'?: { value?: string } } } };
      const name = data.person?.name;
      if (name?.['given-names']?.value && name?.['family-name']?.value) {
        return { name: `${name['given-names'].value} ${name['family-name'].value}` };
      }
      return {};
    } catch {
      return {};
    }
  }

  private async fetchWorks(orcidId: string, token: string): Promise<OrcidWork[]> {
    const res = await fetch(`${ORCID_PUB_API}/${orcidId}/works`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      this.logger.warn(`ORCID works fetch failed: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { group?: Array<{ 'work-summary'?: OrcidWork[] }> };
    if (!data.group) return [];

    const works: OrcidWork[] = [];
    for (const group of data.group) {
      const summaries = group['work-summary'] ?? [];
      for (const s of summaries) {
        works.push(s);
      }
    }

    return works;
  }

  private async getValidAccessToken(profile: { id: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null }): Promise<string> {
    if (profile.tokenExpiresAt && new Date() >= profile.tokenExpiresAt && profile.refreshToken) {
      return this.refreshAccessToken(profile.id, profile.refreshToken);
    }
    return profile.accessToken;
  }

  private async refreshAccessToken(profileId: string, refreshToken: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const res = await fetch(ORCID_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      this.logger.error(`ORCID token refresh failed for profile ${profileId}`);
      throw new UnauthorizedException('Sesion ORCID expirada. Conecta nuevamente.');
    }

    const data = (await res.json()) as OrcidTokenResponse;

    await this.prisma.orcidProfile.update({
      where: { id: profileId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return data.access_token;
  }

  private extractDoi(work: OrcidWork): string | null {
    const extIds = work['external-ids']?.['external-id'] ?? [];
    const doiEntry = extIds.find((e) => e['external-id-type'] === 'doi');
    return doiEntry?.['external-id-value'] ?? null;
  }

  private extractAuthors(work: OrcidWork): Array<{ name: string; sequence?: string; role?: string }> {
    const contributors = work.contributors?.contributor ?? [];
    return contributors.map((c) => ({
      name: c['credit-name']?.value ?? 'Unknown',
      sequence: c['contributor-attributes']?.['contributor-sequence'],
      role: c['contributor-attributes']?.['contributor-role'],
    }));
  }

  private encodeState(userId: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
    let encrypted = cipher.update(userId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decodeState(state: string): string | null {
    try {
      const [ivHex, encrypted] = state.split(':');
      if (!ivHex || !encrypted) return null;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  private getEncryptionKey(): Buffer {
    const secret = process.env.JWT_SECRET ?? 'default-dev-secret-32-bytes-long!!';
    return crypto.scryptSync(secret, 'orcid-state-salt', 32);
  }
}
