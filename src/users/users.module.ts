import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { UsersSeedService } from './seed/users-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService, UsersSeedService],
  exports: [UsersService, TypeOrmModule, UsersSeedService],
})
export class UsersModule {}
