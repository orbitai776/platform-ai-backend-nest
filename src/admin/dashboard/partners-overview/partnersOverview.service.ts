import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../services/redis/redis.service';
import { PartnersOverviewRepository } from './partnersOverview.repository';

@Injectable()
export class PartnersOverviewService {
  private readonly CACHE_KEY = 'dashboard_partners_overview';
  private readonly CACHE_TTL = 180;

  constructor(
    private readonly repo: PartnersOverviewRepository,
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

    const [stats, topPartners] = await Promise.all([
      this.repo.getPartnersStats(),
      this.repo.getTopPartners(),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      stats,
      topPartners,
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
