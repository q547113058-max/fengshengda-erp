// 角色守卫 — 检查 @Roles('boss','finance'...) 装饰器标记的角色
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true; // 没标 = 任何登录用户

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('未登录');
    if (!required.includes(user.role)) {
      throw new ForbiddenException(`需要角色 ${required.join('/')}, 当前 ${user.role}`);
    }
    return true;
  }
}
