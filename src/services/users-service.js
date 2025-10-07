const { hashPassword, verifyPassword, randomUUID } = require('../utils/crypto');

class UsersService {
  constructor() {
    this.users = new Map();
    this.emailIndex = new Map();
  }

  async createUser({ email, password, role }) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }
    if (!role || (role !== 'ADMIN' && role !== 'STAFF')) {
      throw new Error('Role must be ADMIN or STAFF');
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (this.emailIndex.has(normalizedEmail)) {
      throw new Error('Email already registered');
    }
    const passwordHash = hashPassword(password);
    const user = {
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    this.emailIndex.set(normalizedEmail, user.id);
    return this.sanitize(user);
  }

  sanitize(user) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async validateCredentials(email, password) {
    if (!email || !password) {
      return null;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const userId = this.emailIndex.get(normalizedEmail);
    if (!userId) {
      return null;
    }
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return null;
    }
    return this.sanitize(user);
  }

  async findById(id) {
    const user = this.users.get(id);
    return user ? this.sanitize(user) : null;
  }
}

module.exports = { UsersService };
