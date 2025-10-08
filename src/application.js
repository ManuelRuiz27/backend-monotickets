const http = require('node:http');
const { URL } = require('node:url');
const { UsersService } = require('./services/users-service');
const { AuthService } = require('./services/auth-service');
const { EventsService } = require('./services/events-service');
const { InvitesService } = require('./services/invites-service');
const { CheckinsService } = require('./services/checkins-service');
const { RedisService } = require('./services/redis-service');

class MonoticketsApplication {
  constructor(options = {}) {
    this.options = { ...options };
    const secret = this.options.jwtSecret || process.env.JWT_SECRET || 'monotickets-secret';
    const expiresInSeconds = this.options.jwtExpiresInSeconds || Number(process.env.JWT_EXPIRES_IN) || 3600;
    this.redisService = this.options.redisService || new RedisService();
    this.usersService = new UsersService();
    this.authService = new AuthService(this.usersService, { secret, expiresInSeconds });
    this.eventsService = new EventsService();
    this.invitesService = new InvitesService();
    this.checkinsService = new CheckinsService(this.invitesService, this.redisService);
    this.prefix = '/';
    this.validationEnabled = false;
    this.seeded = false;
    this.sampleData = null;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  setGlobalPrefix(prefix) {
    this.prefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  }

  useGlobalValidation(enable) {
    this.validationEnabled = enable;
  }

  async init() {
    await this.seedInitialData();
    return this;
  }

  async listen(port = 0, hostname = '127.0.0.1') {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, hostname, () => {
        this.server.off('error', reject);
        resolve(this.server);
      });
    });
  }

  getHttpServer() {
    return this.server;
  }

  async close() {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  async handleRequest(req, res) {
    try {
      const { method } = req;
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (!url.pathname.startsWith(this.prefix)) {
        this.send(res, 404, { message: 'Not Found' });
        return;
      }
      const relativePath = url.pathname.substring(this.prefix.length) || '/';
      const body = await this.parseBody(req);
      const authPayload = await this.extractAuth(req);

      if (method === 'POST' && relativePath === '/auth/login') {
        await this.handleLogin(body, res);
        return;
      }

      if (method === 'POST' && relativePath === '/superadmin/login') {
        await this.handleSuperAdminLogin(body, res);
        return;
      }

      if (method === 'POST' && relativePath === '/admin/events') {
        await this.ensureRole(authPayload, 'ADMIN');
        await this.handleCreateEvent(body, authPayload, res);
        return;
      }

      const inviteMatch = relativePath.match(/^\/admin\/events\/(.+?)\/invites$/);
      if (method === 'POST' && inviteMatch) {
        await this.ensureRole(authPayload, 'ADMIN');
        await this.handleCreateInvite(inviteMatch[1], body, authPayload, res);
        return;
      }

      if (method === 'POST' && relativePath === '/staff/checkin') {
        await this.ensureRole(authPayload, 'STAFF');
        await this.handleCheckin(body, res);
        return;
      }

      this.send(res, 404, { message: 'Not Found' });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      this.send(res, statusCode, { message: error.message || 'Unexpected error' });
    }
  }

  async parseBody(req) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return {};
    }
    return new Promise((resolve, reject) => {
      const chunks = [];
      req
        .on('data', (chunk) => {
          chunks.push(chunk);
        })
        .on('end', () => {
          if (chunks.length === 0) {
            resolve({});
            return;
          }
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            resolve(parsed);
          } catch (error) {
            reject(new Error('Invalid JSON payload'));
          }
        })
        .on('error', reject);
    });
  }

  async extractAuth(req) {
    const header = req.headers['authorization'];
    if (!header) {
      return null;
    }
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return null;
    }
    const token = match[1];
    return this.authService.verify(token);
  }

  async ensureRole(payload, expectedRole) {
    if (!payload || payload.role !== expectedRole) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }
  }

  send(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  async handleLogin(body, res) {
    const { email, password } = body;
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const token = await this.authService.login(email, password, {
      allowedRoles: ['ADMIN', 'STAFF'],
    });
    this.send(res, 201, { token });
  }

  async handleSuperAdminLogin(body, res) {
    const { email, password } = body;
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const token = await this.authService.login(email, password, {
      allowedRoles: ['SUPERADMIN'],
    });
    this.send(res, 201, { token });
  }

  async handleCreateEvent(body, authPayload, res) {
    const { title, capacity } = body;
    const event = await this.eventsService.createEvent({
      title,
      capacity,
      createdBy: authPayload.sub,
    });
    this.send(res, 201, event);
  }

  async handleCreateInvite(eventId, body, authPayload, res) {
    const event = await this.eventsService.findById(eventId);
    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }
    const { recipientEmail } = body;
    const invite = await this.invitesService.createInvite({
      eventId: event.id,
      recipientEmail,
      createdBy: authPayload.sub,
    });
    this.send(res, 201, { token: invite.token, id: invite.id });
  }

  async handleCheckin(body, res) {
    const { code, gate } = body;
    const result = await this.checkinsService.checkIn({ code, gate });
    this.send(res, 201, result);
  }

  shouldSeed() {
    if (typeof this.options.seedInitialData === 'boolean') {
      return this.options.seedInitialData;
    }
    if (typeof this.options.seed === 'boolean') {
      return this.options.seed;
    }
    const envPreference = process.env.SEED_DATA ?? process.env.SEED_USERS;
    if (!envPreference) {
      return true;
    }
    const lowered = envPreference.toLowerCase();
    return !['false', '0', 'no'].includes(lowered);
  }

  async seedInitialData() {
    if (this.seeded || !this.shouldSeed()) {
      return;
    }

    const admin = await this.ensureUser({
      email: 'admin@monotickets.test',
      password: 'Secret123!',
      role: 'ADMIN',
    });
    const staff = await this.ensureUser({
      email: 'staff@monotickets.test',
      password: 'Secret123!',
      role: 'STAFF',
    });
    const superadmin = await this.ensureUser({
      email: 'superadmin@monotickets.test',
      password: 'SuperSecret123!',
      role: 'SUPERADMIN',
    });

    const demoEvent = await this.ensureEvent({
      title: 'Demo Conference',
      capacity: 250,
      createdBy: admin.id,
    });
    const invite = await this.ensureInvite({
      eventId: demoEvent.id,
      recipientEmail: 'guest@monotickets.test',
      createdBy: admin.id,
    });

    this.sampleData = {
      admin: { ...admin, password: 'Secret123!' },
      staff: { ...staff, password: 'Secret123!' },
      superadmin: { ...superadmin, password: 'SuperSecret123!' },
      event: demoEvent,
      invite,
    };
    this.seeded = true;

    if (this.options.logSeedOutput !== false && process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(
        'Seeded demo data:',
        JSON.stringify(
          {
            admin: { email: this.sampleData.admin.email, password: this.sampleData.admin.password },
            staff: { email: this.sampleData.staff.email, password: this.sampleData.staff.password },
            superadmin: { email: this.sampleData.superadmin.email, password: this.sampleData.superadmin.password },
            event: { id: demoEvent.id, title: demoEvent.title },
            invite: { token: invite.token, recipientEmail: invite.recipientEmail },
          },
          null,
          2,
        ),
      );
    }
  }

  async ensureUser({ email, password, role }) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return existing;
    }
    return this.usersService.createUser({ email, password, role });
  }

  async ensureEvent({ title, capacity, createdBy }) {
    const existing = await this.eventsService.findByTitle(title);
    if (existing) {
      return existing;
    }
    return this.eventsService.createEvent({ title, capacity, createdBy });
  }

  async ensureInvite({ eventId, recipientEmail, createdBy }) {
    const existing = await this.invitesService.findByRecipientAndEvent(recipientEmail, eventId);
    if (existing) {
      return existing;
    }
    return this.invitesService.createInvite({ eventId, recipientEmail, createdBy });
  }

  getSeedSummary() {
    return this.sampleData;
  }
}

module.exports = { MonoticketsApplication };
