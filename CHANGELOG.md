# Changelog

## [1.0.0] - 2025-10-07
### Added
- Initial Monotickets backend MVP with NestJS 10, TypeORM, JWT auth, and Redis integration.
- Auth module with contract-locked login response and global guards.
- Events, Invites, and Checkins modules with UUID invite tokens and duplicate detection.
- WebSocket gateway broadcasting `inside_incr` updates and Redis-backed counters.
- Docker configuration, environment templates, and comprehensive README.
- Unit tests for Auth, Events, Invites services plus E2E coverage for login, event creation, and staff check-in flows.
