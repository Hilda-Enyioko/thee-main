import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env';
import type { UserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Principal, PrincipalKind, TokenPair, TokenPayload } from './auth.types';
import { PasswordService } from './password.service';

interface Account {
  principal: Principal;
  passwordHash: string;
  status: UserStatus;
  tokenVersion: number;
}

type Lookup = { id: string } | { email: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(kind: PrincipalKind, email: string, password: string): Promise<TokenPair> {
    const account = await this.lookup(kind, { email });
    const ok = await this.passwords.verify(password, account?.passwordHash ?? null);
    if (!account || !ok) throw new UnauthorizedException('Invalid email or password');
    this.assertUsable(account);
    return this.issue(account);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyToken(refreshToken, 'refresh');
    return this.issue(await this.load(payload));
  }

  async authenticate(accessToken: string): Promise<Principal> {
    const payload = await this.verifyToken(accessToken, 'access');
    return (await this.load(payload)).principal;
  }

  private async load(payload: TokenPayload): Promise<Account> {
    const account = await this.lookup(payload.kind, { id: payload.sub });
    if (!account || account.tokenVersion !== payload.tv) throw new UnauthorizedException();
    this.assertUsable(account);
    return account;
  }

  private assertUsable(a: Account): void {
    if (a.status !== 'ACTIVE') throw new ForbiddenException('Account is deactivated or suspended');
    const p = a.principal;
    if (p.kind !== 'staff' && p.orgStatus === 'SUSPENDED') {
      throw new ForbiddenException('This organisation is suspended');
    }
  }

  private async verifyToken(token: string, typ: TokenPayload['typ']): Promise<TokenPayload> {
    try {
      const secret =
        typ === 'access'
          ? this.config.get('JWT_ACCESS_SECRET', { infer: true })
          : this.config.get('JWT_REFRESH_SECRET', { infer: true });
      const payload = await this.jwt.verifyAsync<TokenPayload>(token, { secret });
      if (payload.typ !== typ) throw new Error('wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async issue(a: Account): Promise<TokenPair> {
    const base = { sub: a.principal.id, kind: a.principal.kind, tv: a.tokenVersion };
    const accessTtl = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, typ: 'access' },
        {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
          expiresIn: accessTtl,
        },
      ),
      this.jwt.signAsync(
        { ...base, typ: 'refresh' },
        {
          secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: refreshTtl,
        },
      ),
    ]);
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  private async lookup(kind: PrincipalKind, where: Lookup): Promise<Account | null> {
    if (kind === 'staff') {
      const u = await this.prisma.staffUser.findFirst({ where });
      return (
        u && {
          principal: { kind, id: u.id, role: u.role },
          passwordHash: u.passwordHash,
          status: u.status,
          tokenVersion: u.tokenVersion,
        }
      );
    }
    if (kind === 'provider') {
      const u = await this.prisma.providerUser.findFirst({
        where,
        include: { provider: { select: { status: true } } },
      });
      return (
        u && {
          principal: { kind, id: u.id, role: u.role, orgId: u.providerId, orgStatus: u.provider.status },
          passwordHash: u.passwordHash,
          status: u.status,
          tokenVersion: u.tokenVersion,
        }
      );
    }
    const u = await this.prisma.distributorUser.findFirst({
      where,
      include: { distributor: { select: { status: true } } },
    });
    return (
      u && {
        principal: { kind, id: u.id, role: u.role, orgId: u.distributorId, orgStatus: u.distributor.status },
        passwordHash: u.passwordHash,
        status: u.status,
        tokenVersion: u.tokenVersion,
      }
    );
  }
}
