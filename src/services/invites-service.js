const { randomUUID, base64UrlEncode } = require('../utils/crypto');
const { randomBytes } = require('node:crypto');

class InvitesService {
  constructor() {
    this.invites = new Map();
  }

  generateToken() {
    return base64UrlEncode(randomBytes(24));
  }

  async createInvite({ eventId, recipientEmail, createdBy }) {
    if (!eventId) {
      throw new Error('eventId is required');
    }
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      throw new Error('recipientEmail is required');
    }
    const token = this.generateToken();
    const invite = {
      id: randomUUID(),
      eventId,
      token,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      createdBy,
      createdAt: new Date(),
      consumedAt: null,
      gate: null,
    };
    this.invites.set(token, invite);
    return { ...invite };
  }

  async findByToken(token) {
    return this.invites.get(token) || null;
  }

  async markConsumed(invite, gate) {
    if (!invite.consumedAt) {
      invite.consumedAt = new Date();
      invite.gate = gate;
    }
    return { ...invite };
  }
}

module.exports = { InvitesService };
