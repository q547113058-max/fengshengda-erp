// AuthController — 登录、用户列表、当前用户
import { Controller, Get, Post, Body, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';
import { GetUser } from '../common/get-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录 → 返回 access_token + user' })
  // 登录限流：20 次/分钟/IP（演示环境放宽；生产建议 5/分钟）
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Body() body: { username: string; password: string }) {
    // addSelect('user.password_hash') 才能拿到，因为 entity 上 select:false
    const u = await this.users
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.username = :username AND user.status = :status', {
        username: body.username,
        status: 'active',
      })
      .getOne();
    if (!u) throw new UnauthorizedException('账号不存在');
    // bcrypt 比对（防 timing attack 用 bcrypt.compare）
    const ok = await bcrypt.compare(body.password, u.password_hash);
    if (!ok) throw new UnauthorizedException('密码错误');
    // 签发 JWT
    const access_token = this.jwt.sign({
      sub: u.id,
      username: u.username,
      role: u.role,
      full_name: u.full_name,
    });
    return {
      access_token,
      user: {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        status: u.status,
        default_commission_rate: u.default_commission_rate,
        phone: u.phone,
      },
    };
  }

  // 用户列表 — 仅 boss 可看
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss')
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户列表（限 boss）' })
  async list() {
    // 默认无 password_hash（select:false），安全
    return this.users.find({ order: { id: 'ASC' } });
  }

  // 当前用户 — 任何登录用户可调
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前登录用户' })
  async me(@GetUser() user: any) {
    return user;
  }
}
