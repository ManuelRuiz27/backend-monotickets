import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_EXPIRES_IN') return 3600;
              if (key === 'JWT_SECRET') return 'secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a token for valid credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      password: 'hashed',
      role: UserRole.ADMIN,
    } as any);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login('admin@example.com', 'password');

    expect(result).toEqual({
      token: 'jwt-token',
      expiresIn: 3600,
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      },
    });
  });

  it('throws when password does not match', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      password: 'hashed',
      role: UserRole.ADMIN,
    } as any);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as any);

    await expect(service.login('admin@example.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when user is missing', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);
    await expect(service.login('missing@example.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
