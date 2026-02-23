import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    // Owner has access to everything
    if (user.role === 'owner') {
      return true;
    }
    
    // Admin has access to admin routes but not owner routes
    if (user.role === 'admin' && !requiredRoles.includes('owner')) {
      return requiredRoles.includes('admin');
    }
    
    return requiredRoles.some((role) => user.role === role);
  }
}
