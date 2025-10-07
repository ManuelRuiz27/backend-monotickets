const { signToken, verifyToken } = require('../utils/crypto');

class AuthService {
  constructor(usersService, options = {}) {
    this.usersService = usersService;
    this.secret = options.secret || 'monotickets-secret';
    const expires = Number(options.expiresInSeconds ?? 3600);
    this.expiresInSeconds = Number.isFinite(expires) && expires > 0 ? expires : 3600;
  }

  async login(email, password) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
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
