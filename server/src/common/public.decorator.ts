// @Public() 装饰器 — 标记端点不需要 JWT
// 与全局 APP_GUARD = JwtAuthGuard 配合使用
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
