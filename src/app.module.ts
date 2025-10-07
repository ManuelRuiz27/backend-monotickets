import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { InvitesModule } from './invites/invites.module';
import { CheckinsModule } from './checkins/checkins.module';
import { RedisModule } from './redis/redis.module';
import { WsModule } from './websocket/ws.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'postgres');
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get('DB_DATABASE', ':memory:'),
            dropSchema: true,
            entities: ['dist/**/*.entity{.ts,.js}', 'src/**/*.entity.ts'],
            synchronize: true,
          } as any;
        }
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: parseInt(configService.get('DB_PORT', '5432'), 10),
          username: configService.get('DB_USER', 'postgres'),
          password: configService.get('DB_PASSWORD', 'postgres'),
          database: configService.get('DB_NAME', 'monotickets'),
          autoLoadEntities: true,
          synchronize: configService.get('NODE_ENV') !== 'production',
        } as any;
      },
    }),
    RedisModule,
    WsModule,
    UsersModule,
    AuthModule,
    EventsModule,
    InvitesModule,
    CheckinsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
