class CheckinsService {
  constructor(invitesService, redisService) {
    this.invitesService = invitesService;
    this.redisService = redisService;
  }

  async checkIn({ code, gate }) {
    if (!code || typeof code !== 'string') {
      throw new Error('code is required');
    }
    if (!gate || typeof gate !== 'string') {
      throw new Error('gate is required');
    }
    const invite = await this.invitesService.findByToken(code);
    if (!invite) {
      const error = new Error('Invite not found');
      error.statusCode = 404;
      throw error;
    }
    const duplicate = Boolean(invite.consumedAt);
    if (!duplicate) {
      await this.invitesService.markConsumed(invite, gate);
    }
    let insideCount;
    if (duplicate) {
      insideCount = await this.redisService.getInsideCount(invite.eventId);
    } else {
      insideCount = await this.redisService.incrementInsideCount(invite.eventId, 1);
    }
    return {
      duplicate,
      insideCount,
      inviteId: invite.id,
      eventId: invite.eventId,
    };
  }
}

module.exports = { CheckinsService };
