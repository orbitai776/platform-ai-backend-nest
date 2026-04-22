import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../services/redis/redis.service';
import { UsersOverviewRepository } from './usersOverview.repository';

@Injectable()
export class UsersOverviewService {
  private readonly CACHE_KEY = 'dashboard_users_overview';
  private readonly CACHE_TTL = 180;

  constructor(
    private readonly repo: UsersOverviewRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async getOverview() {
    let cached: string | null = null;

    try {
      cached = await this.redisService.get(this.CACHE_KEY);
    } catch (error) {
      console.log('Redis unavailable, skip cache read');
    }

    if (cached) {
      return {
        source: 'cache',
        ...JSON.parse(cached),
      };
    }

    const [stats, topUsers] = await Promise.all([
      this.repo.getUsersStats(),
      this.repo.getTopUsers(),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      stats,
      topUsers,
    };

    try {
      await this.redisService.setex(
        this.CACHE_KEY,
        this.CACHE_TTL,
        JSON.stringify(payload),
      );
    } catch (error) {
      console.log('Redis unavailable, skip cache write');
    }

    return {
      source: 'live',
      ...payload,
    };
  }
}
