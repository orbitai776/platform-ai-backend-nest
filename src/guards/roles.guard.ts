import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const roles = Array.isArray(user?.roles)
      ? user.roles
      : typeof user?.role === 'string'
        ? [user.role]
        : [];

    const isAllowed = roles.some((role: string) => requiredRoles.includes(role));

    if (!isAllowed) {
      throw new ForbiddenException('Admin role required');
    }

    return true;
  }
}
