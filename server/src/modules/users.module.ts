import { Module, Controller, Get, Post, Put, Body, Param, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { GetUser } from '../common/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
class UsersController {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  @Get()
  list() { return this.repo.find({ order: { id: 'ASC' } }); }

  @Post()
  async create(@Body() body: any, @GetUser() caller: any) {
    if (caller.role !== 'boss') throw new ForbiddenException('仅老板可新增用户');
    if (!body.username || !body.password || !body.full_name || !body.role) {
      throw new BadRequestException('工号、密码、姓名、角色必填');
    }
    const exists = await this.repo.findOneBy({ username: body.username });
    if (exists) throw new BadRequestException('工号已存在');
    const user = this.repo.create({
      username: body.username,
      password_hash: await bcrypt.hash(body.password, 10),
      full_name: body.full_name,
      role: body.role,
      phone: body.phone || '',
      default_commission_rate: body.default_commission_rate || 0,
      status: 'active',
    });
    const saved = await this.repo.save(user);
    return { id: saved.id, username: saved.username, full_name: saved.full_name, role: saved.role };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @GetUser() caller: any) {
    const targetId = Number(id);
    // 只能改自己，boss 能改所有人
    if (caller.role !== 'boss' && caller.sub !== targetId) {
      throw new ForbiddenException('只能修改自己的资料');
    }
    const patch: any = {};
    if (body.full_name !== undefined) patch.full_name = body.full_name;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.default_commission_rate !== undefined) patch.default_commission_rate = body.default_commission_rate;
    // boss 专属：改角色/状态
    if (caller.role === 'boss') {
      if (body.role !== undefined) patch.role = body.role;
      if (body.status !== undefined) patch.status = body.status;
    }
    // 改密码（需验证旧密码，boss 可跳过）
    if (body.new_password) {
      if (caller.role !== 'boss') {
        if (!body.old_password) throw new ForbiddenException('请输入旧密码');
        const u = await this.repo.createQueryBuilder('u').addSelect('u.password_hash').where('u.id = :id', { id: targetId }).getOne();
        if (!u || !(await bcrypt.compare(body.old_password, u.password_hash))) {
          throw new ForbiddenException('旧密码错误');
        }
      }
      patch.password_hash = await bcrypt.hash(body.new_password, 10);
    }
    await this.repo.update(targetId, patch);
    return this.repo.findOneBy({ id: targetId });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
})
export class UsersModule {}
