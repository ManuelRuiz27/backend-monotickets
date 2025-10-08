const { signToken, verifyToken } = require('../utils/crypto');

class AuthService {
  constructor(usersService, options = {}) {
    this.usersService = usersService;
    this.secret = options.secret || 'monotickets-secret';
    const expires = Number(options.expiresInSeconds ?? 3600);
    this.expiresInSeconds = Number.isFinite(expires) && expires > 0 ? expires : 3600;
  }

  async login(email, password, options = {}) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 400;
      throw error;
    }

    if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
      const error = new Error('Unauthorized role for this endpoint');
      error.statusCode = 403;
      throw error;
    }
    return this.createToken(user);
  }

  createToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      exp: now + this.expiresInSeconds,
    };
    return signToken(payload, this.secret);
  }

  verify(token) {
    const payload = verifyToken(token, this.secret);
    if (!payload) {
      return null;
    }
    return payload;
  }
}

module.exports = { AuthService };
