import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string): Promise<'OK'> {
    return await this.redis.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return await this.redis.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async ping(): Promise<string> {
    return await this.redis.ping();
  }
}