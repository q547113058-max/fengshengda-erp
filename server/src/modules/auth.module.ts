import { Module, Controller, Get, Post, Body, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('auth')
class AuthController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const u = await this.users.findOne({ where: { username: body.username, status: 'active' } });
    if (!u) throw new UnauthorizedException('账号不存在');
    if (u.password_hash !== body.password) throw new UnauthorizedException('密码错误');
    return {
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      status: u.status,
      default_commission_rate: u.default_commission_rate,
      phone: u.phone,
    };
  }

  @Get('users')
  list() {
    return this.users.find({ order: { id: 'ASC' } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
})
export class AuthModule {}
