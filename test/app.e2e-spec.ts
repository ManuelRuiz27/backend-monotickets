import { MonoticketsApplication } from '../src/application';

type JsonResponse<T> = {
  status: number;
  body: T;
};

type SeedSummary = {
  admin: { id: string; email: string; password: string };
  staff: { id: string; email: string; password: string };
  superadmin: { id: string; email: string; password: string };
  event: { id: string; title: string };
  invite: { id: string; token: string; recipientEmail: string; eventId: string };
};

describe('App E2E', () => {
  let app: InstanceType<typeof MonoticketsApplication>;
  let server: any;
  let baseUrl: string;
  const insideCounts: Record<string, number> = {};
  let seedData: SeedSummary;
  let adminCredentials: { email: string; password: string };
  let staffCredentials: { email: string; password: string };
  let superadminCredentials: { email: string; password: string };

  const redisService = {
    async incrementInsideCount(eventId: string, delta: number) {
      insideCounts[eventId] = (insideCounts[eventId] ?? 0) + delta;
      return insideCounts[eventId];
    },
    async getInsideCount(eventId: string) {
      return insideCounts[eventId] ?? 0;
    },
    async resetInsideCount(eventId: string) {
      delete insideCounts[eventId];
    },
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '3600';

    app = new MonoticketsApplication({
      redisService,
      jwtSecret: 'test-secret',
      jwtExpiresInSeconds: 3600,
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalValidation(true);
    await app.init();

    seedData = app.getSeedSummary() as SeedSummary;
    if (!seedData) {
      throw new Error('Expected seeded data to be available');
    }
    adminCredentials = {
      email: seedData.admin.email,
      password: seedData.admin.password,
    };
    staffCredentials = {
      email: seedData.staff.email,
      password: seedData.staff.password,
    };
    superadminCredentials = {
      email: seedData.superadmin.email,
      password: seedData.superadmin.password,
    };

    server = await app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to obtain listening address');
    }
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  it('permite autenticar al super admin solo via su endpoint dedicado', async () => {
    const superLogin = await post<{ token: string }>('/superadmin/login', {
      email: superadminCredentials.email,
      password: superadminCredentials.password,
    });
    expect(superLogin.status).toBe(201);
    expect(superLogin.body.token).toBeDefined();

    const viaSharedEndpoint = await post<{ message: string }>('/auth/login', {
      email: superadminCredentials.email,
      password: superadminCredentials.password,
    });
    expect(viaSharedEndpoint.status).toBe(403);
  });

  afterAll(async () => {
    await app.close();
  });

  async function post<T>(path: string, body: unknown, token?: string): Promise<JsonResponse<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as T;
    return { status: response.status, body: data };
  }

  it('logs in admin and creates an event', async () => {
    const loginResponse = await post<{ token: string }>('/auth/login', {
      email: adminCredentials.email,
      password: adminCredentials.password,
    });
    expect(loginResponse.status).toBe(201);

    const token = loginResponse.body.token;
    expect(token).toBeDefined();

    const eventResponse = await post<{ title: string }>('/admin/events', {
      title: 'Expo 2025',
      capacity: 500,
    }, token);

    expect(eventResponse.status).toBe(201);
    expect(eventResponse.body.title).toBe('Expo 2025');
  });

  it('allows staff to check in a guest invite', async () => {
    const adminLogin = await post<{ token: string }>('/auth/login', {
      email: adminCredentials.email,
      password: adminCredentials.password,
    });
    const adminToken = adminLogin.body.token;

    const eventResponse = await post<{ id: string }>('/admin/events', {
      title: 'Tech Summit',
      capacity: 200,
    }, adminToken);
    const eventId = eventResponse.body.id;

    const inviteResponse = await post<{ token: string }>(
      `/admin/events/${eventId}/invites`,
      { recipientEmail: 'guest@example.com' },
      adminToken,
    );
    expect(inviteResponse.status).toBe(201);
    const inviteToken = inviteResponse.body.token;

    const staffLogin = await post<{ token: string }>('/auth/login', {
      email: staffCredentials.email,
      password: staffCredentials.password,
    });
    const staffToken = staffLogin.body.token;

    const checkinResponse = await post<{
      duplicate: boolean;
      insideCount: number;
    }>(
      '/staff/checkin',
      { code: inviteToken, gate: 'A1' },
      staffToken,
    );

    expect(checkinResponse.status).toBe(201);
    expect(checkinResponse.body.duplicate).toBe(false);
    expect(checkinResponse.body.insideCount).toBeGreaterThanOrEqual(1);
  });

  it('allows checking in the seeded invite with staff credentials', async () => {
    const staffLogin = await post<{ token: string }>('/auth/login', {
      email: staffCredentials.email,
      password: staffCredentials.password,
    });
    const staffToken = staffLogin.body.token;

    const firstCheck = await post<{
      duplicate: boolean;
      insideCount: number;
      eventId: string;
    }>(
      '/staff/checkin',
      { code: seedData.invite.token, gate: 'SEED' },
      staffToken,
    );
    expect(firstCheck.status).toBe(201);
    expect(firstCheck.body.duplicate).toBe(false);
    expect(firstCheck.body.eventId).toBe(seedData.event.id);

    const secondCheck = await post<{
      duplicate: boolean;
      insideCount: number;
    }>(
      '/staff/checkin',
      { code: seedData.invite.token, gate: 'SEED' },
      staffToken,
    );
    expect(secondCheck.status).toBe(201);
    expect(secondCheck.body.duplicate).toBe(true);
  });

  it('rejects invalid credentials and unauthorized event creation', async () => {
    const badLogin = await post<{ message: string }>('/auth/login', {
      email: adminCredentials.email,
      password: 'wrong-password',
    });
    expect(badLogin.status).toBe(400);

    const unauthorizedEvent = await post<{ message: string }>('/admin/events', {
      title: 'Nope',
      capacity: 10,
    });
    expect(unauthorizedEvent.status).toBe(401);
  });

  it('marks duplicate check-ins without incrementing the counter', async () => {
    const adminLogin = await post<{ token: string }>('/auth/login', {
      email: adminCredentials.email,
      password: adminCredentials.password,
    });
    const adminToken = adminLogin.body.token;

    const eventResponse = await post<{ id: string }>('/admin/events', {
      title: 'Data Summit',
      capacity: 50,
    }, adminToken);
    const eventId = eventResponse.body.id;

    const inviteResponse = await post<{ token: string }>(
      `/admin/events/${eventId}/invites`,
      { recipientEmail: 'repeat@example.com' },
      adminToken,
    );
    const inviteToken = inviteResponse.body.token;

    const staffLogin = await post<{ token: string }>('/auth/login', {
      email: staffCredentials.email,
      password: staffCredentials.password,
    });
    const staffToken = staffLogin.body.token;

    const firstCheck = await post<{ duplicate: boolean; insideCount: number }>(
      '/staff/checkin',
      { code: inviteToken, gate: 'B2' },
      staffToken,
    );
    expect(firstCheck.status).toBe(201);
    const countAfterFirst = firstCheck.body.insideCount;

    const secondCheck = await post<{ duplicate: boolean; insideCount: number }>(
      '/staff/checkin',
      { code: inviteToken, gate: 'B2' },
      staffToken,
    );
    expect(secondCheck.status).toBe(201);
    expect(secondCheck.body.duplicate).toBe(true);
    expect(secondCheck.body.insideCount).toBe(countAfterFirst);
  });
});
