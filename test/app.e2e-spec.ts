import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/common/enums/role.enum';
import { RedisService } from '../src/redis/redis.service';

describe('App E2E', () => {
  let app: INestApplication;
  let usersService: UsersService;
  const insideCounts: Record<string, number> = {};

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_DATABASE = ':memory:';
    process.env.SEED_USERS = 'false';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '3600';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue({
        incrementInsideCount: async (eventId: string, delta: number) => {
          insideCounts[eventId] = (insideCounts[eventId] ?? 0) + delta;
          return insideCounts[eventId];
        },
        getInsideCount: async (eventId: string) => insideCounts[eventId] ?? 0,
        resetInsideCount: async (eventId: string) => {
          insideCounts[eventId] = 0;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    usersService = moduleFixture.get(UsersService);
    await usersService.createUser({
      email: 'admin@test.com',
      password: 'Secret123!',
      role: UserRole.ADMIN,
    });
    await usersService.createUser({
      email: 'staff@test.com',
      password: 'Secret123!',
      role: UserRole.STAFF,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in admin and creates an event', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Secret123!' })
      .expect(201);

    const token = loginResponse.body.token;
    expect(token).toBeDefined();

    const eventResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Expo 2025', capacity: 500 })
      .expect(201);

    expect(eventResponse.body.title).toBe('Expo 2025');
  });

  it('allows staff to check in a guest invite', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Secret123!' });
    const adminToken = adminLogin.body.token;

    const eventResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Tech Summit', capacity: 200 });
    const eventId = eventResponse.body.id;

    const inviteResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${eventId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipientEmail: 'guest@example.com' })
      .expect(201);

    const inviteToken = inviteResponse.body.token;

    const staffLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@test.com', password: 'Secret123!' });
    const staffToken = staffLogin.body.token;

    const checkinResponse = await request(app.getHttpServer())
      .post('/api/v1/staff/checkin')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ code: inviteToken, gate: 'A1' })
      .expect(201);

    expect(checkinResponse.body.duplicate).toBe(false);
    expect(checkinResponse.body.insideCount).toBeGreaterThanOrEqual(1);
  });
});
