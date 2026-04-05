import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../services/redis/redis.service';
import { ServicesOverviewRepository } from './servicesOverview.repository';

@Injectable()
export class ServicesOverviewService {
  private readonly CACHE_KEY = 'dashboard_services_overview';
  private readonly CACHE_TTL = 180;

  constructor(
    private readonly repo: ServicesOverviewRepository,
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

  const [users, partners, services] = await Promise.all([
    this.repo.getUsersStats(),
    this.repo.getPartnersStats(),
    this.repo.getServicesStats(),
    
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    users,
    partners,
    services,
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