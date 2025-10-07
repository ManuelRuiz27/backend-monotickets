import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UserRole } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'createdAt', 'updatedAt'],
    });
  }

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async ensureSeedUsers(seedUsers: Array<{ email: string; password: string; role: UserRole }>) {
    for (const seed of seedUsers) {
      const existing = await this.usersRepository.findOne({ where: { email: seed.email } });
      if (existing) {
        continue;
      }
      const hashed = await bcrypt.hash(seed.password, 10);
      await this.usersRepository.save(
        this.usersRepository.create({
          email: seed.email,
          password: hashed,
          role: seed.role,
        }),
      );
    }
  }

  async createUser(payload: { email: string; password: string; role: UserRole }) {
    const hashed = await bcrypt.hash(payload.password, 10);
    const entity = this.usersRepository.create({
      email: payload.email,
      password: hashed,
      role: payload.role,
    });
    return this.usersRepository.save(entity);
  }
}
