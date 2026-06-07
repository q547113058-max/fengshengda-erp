// JWT 验证策略 — 从 Authorization: Bearer xxx 解码
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-CHANGE-ME-in-prod',
    });
  }

  async validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException('token 无效');
    // 把 payload 挂到 req.user
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      full_name: payload.full_name,
    };
  }
}
