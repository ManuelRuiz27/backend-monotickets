class RedisService {
  constructor() {
    this.counts = new Map();
  }

  async incrementInsideCount(eventId, delta) {
    const current = this.counts.get(eventId) ?? 0;
    const next = current + delta;
    this.counts.set(eventId, next);
    return next;
  }

  async getInsideCount(eventId) {
    return this.counts.get(eventId) ?? 0;
  }

  async resetInsideCount(eventId) {
    this.counts.delete(eventId);
  }
}

module.exports = { RedisService };
