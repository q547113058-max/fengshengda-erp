import { Module, Controller, Get } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('users')
class UsersController {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
  @Get() list() { return this.repo.find({ order: { id: 'ASC' } }); }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
})
export class UsersModule {}
