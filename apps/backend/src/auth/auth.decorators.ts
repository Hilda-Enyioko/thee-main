import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest, PrincipalKind } from './auth.types';

export const IS_PUBLIC = 'isPublic';
export const ACCESS_RULE = 'accessRule';

export interface AccessRule {
  kind: PrincipalKind;
  roles?: readonly string[];
}

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Access = (rule: AccessRule) => SetMetadata(ACCESS_RULE, rule);

export const CurrentPrincipal = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
  ctx.switchToHttp().getRequest<AuthenticatedRequest>().principal,
);
