const { randomUUID } = require('../utils/crypto');

class EventsService {
  constructor() {
    this.events = new Map();
  }

  async createEvent({ title, capacity, createdBy }) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Title is required');
    }
    const numericCapacity = Number(capacity);
    if (!Number.isInteger(numericCapacity) || numericCapacity <= 0) {
      throw new Error('Capacity must be a positive integer');
    }
    const event = {
      id: randomUUID(),
      title: title.trim(),
      capacity: numericCapacity,
      createdBy,
      createdAt: new Date(),
    };
    this.events.set(event.id, event);
    return { ...event };
  }

  async findById(eventId) {
    return this.events.get(eventId) || null;
  }
}

module.exports = { EventsService };
