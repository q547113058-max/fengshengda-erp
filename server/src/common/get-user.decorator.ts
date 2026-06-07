// 装饰器：从 req.user 拿当前登录用户
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator((_: unknown, ctx: ExecutionContext): any => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
