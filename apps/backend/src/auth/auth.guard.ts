import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_RULE, AccessRule, IS_PUBLIC } from './auth.decorators';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    const principal = await this.auth.authenticate(token);
    req.principal = principal;

    // Deny by default: a route with neither @Public nor @Access is a bug.
    const rule = this.reflector.getAllAndOverride<AccessRule | undefined>(ACCESS_RULE, targets);
    if (!rule) throw new ForbiddenException();
    if (rule.kind !== principal.kind) throw new ForbiddenException();
    if (rule.roles && !rule.roles.includes(principal.role)) throw new ForbiddenException();
    return true;
  }
}
