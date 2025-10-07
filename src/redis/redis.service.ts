import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private fallback = new Map<string, number>();
  private disabled = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<string | number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD');
    try {
      this.client = new Redis({ host, port, password: password || undefined });
      this.client.on('error', (err) => {
        this.logger.warn(`Redis connection issue: ${err.message}`);
        this.disabled = true;
      });
    } catch (error) {
      this.logger.warn('Redis disabled, fallback to in-memory storage');
      this.disabled = true;
    }
  }

  private keyForEvent(eventId: string) {
    return `event:${eventId}:inside_count`;
  }

  private async useClient<T>(fn: (client: Redis) => Promise<T>, fallback: () => T): Promise<T> {
    if (!this.client || this.disabled) {
      return fallback();
    }
    try {
      const result = await fn(this.client);
      return result;
    } catch (error) {
      this.logger.error(`Redis operation failed: ${error.message}`);
      this.disabled = true;
      return fallback();
    }
  }

  async incrementInsideCount(eventId: string, delta: number) {
    const key = this.keyForEvent(eventId);
    return this.useClient(
      async (client) => {
        const value = await client.incrby(key, delta);
        this.fallback.set(key, value);
        return value;
      },
      () => {
        const value = (this.fallback.get(key) ?? 0) + delta;
        this.fallback.set(key, value);
        return value;
      },
    );
  }

  async getInsideCount(eventId: string) {
    const key = this.keyForEvent(eventId);
    return this.useClient(
      async (client) => {
        const value = await client.get(key);
        const numeric = value ? parseInt(value, 10) : 0;
        this.fallback.set(key, numeric);
        return numeric;
      },
      () => this.fallback.get(key) ?? 0,
    );
  }

  async resetInsideCount(eventId: string) {
    const key = this.keyForEvent(eventId);
    this.fallback.set(key, 0);
    await this.useClient(
      async (client) => {
        await client.set(key, '0');
      },
      () => undefined,
    );
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
