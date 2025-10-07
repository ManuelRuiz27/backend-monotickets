import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(email: string, password: string) {
    // [CONTRACT-LOCK:AUTH_LOGIN] NO MODIFICAR SIN MIGRACIÓN
    const user = await this.validateUser(email, password);
    const expiresInConfig = this.configService.get<string | number>('JWT_EXPIRES_IN', 3600);
    const expiresInNumber =
      typeof expiresInConfig === 'string' ? parseInt(expiresInConfig, 10) : expiresInConfig;
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: expiresInConfig,
      secret: this.configService.get<string>('JWT_SECRET', 'change-me'),
    });
    return {
      token,
      expiresIn: expiresInNumber,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
