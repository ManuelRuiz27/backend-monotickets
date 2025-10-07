import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users.service';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class UsersSeedService implements OnModuleInit {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const enableSeed = this.configService.get('SEED_USERS', 'true');
    if (String(enableSeed).toLowerCase() === 'false') {
      return;
    }

    const superAdminEmail = this.configService.get<string>('SUPERADMIN_EMAIL', 'superadmin@example.com');
    const superAdminPassword = this.configService.get<string>(
      'SUPERADMIN_PASSWORD',
      'ChangeMe123!',
    );
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@example.com');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'ChangeMe123!');

    await this.usersService.ensureSeedUsers([
      { email: superAdminEmail, password: superAdminPassword, role: UserRole.SUPERADMIN },
      { email: adminEmail, password: adminPassword, role: UserRole.ADMIN },
    ]);
    this.logger.log('Seed users ensured');
  }
}
