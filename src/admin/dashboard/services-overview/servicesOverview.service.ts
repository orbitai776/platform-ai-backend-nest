import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { successResponse } from '../../../common/response/adminResponse.util';
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

  private normalizePayload(payload: any, source: 'cache' | 'live') {
    const services = payload?.services ?? {};

    return successResponse(
      {
        source,
        generatedAt: payload.generatedAt,
        summary: {
          users: {
            total: payload?.users?.total ?? 0,
            active: payload?.users?.active ?? 0,
            inactive: payload?.users?.inactive ?? 0,
          },
          partners: {
            total: payload?.partners?.total ?? 0,
            active: payload?.partners?.active ?? 0,
            inactive: payload?.partners?.inactive ?? 0,
          },
          services: {
            catalogTotal: services.catalog_total ?? 0,
            catalogActive: services.catalog_active ?? 0,
            catalogInactive: services.catalog_inactive ?? 0,
            deployedTotal: services.deployed_total ?? 0,
            deployedActive: services.deployed_active ?? 0,
            deployedInactive: services.deployed_inactive ?? 0,
            totalTokenUsed: services.total_token_used ?? 0,
            recent30dTokens: services.recent_30d_tokens ?? 0,
            partnerUsingCount: services.partner_using_count ?? 0,
          },
        },
        topServices: Array.isArray(services.topServices)
          ? services.topServices.map((item: any) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              partnerCount: item.partner_count ?? 0,
              deployedCount: item.deployed_count ?? 0,
              tokenUsed: item.token_used ?? 0,
            }))
          : [],
      },
      'Admin dashboard services overview fetched successfully',
    );
  }

  async getOverview() {
    let cached: string | null = null;

    try {
      cached = await this.redisService.get(this.CACHE_KEY);
    } catch (error) {
      console.log('Redis unavailable, skip cache read');
    }

    if (cached) {
      return this.normalizePayload(JSON.parse(cached), 'cache');
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

    return this.normalizePayload(payload, 'live');
  }
}
