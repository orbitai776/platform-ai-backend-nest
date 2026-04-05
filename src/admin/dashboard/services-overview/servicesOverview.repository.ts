import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../services/database/database.service';

@Injectable()
export class ServicesOverviewRepository {
  constructor(private readonly db: DatabaseService) {}

  async getUsersStats() {
    return await this.db.queryOne<{
      total: number;
      active: number;
      inactive: number;
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status <> 'active' OR status IS NULL)::int AS inactive
      FROM users
    `);
  }

  async getPartnersStats() {
    return await this.db.queryOne<{
      total: number;
      active: number;
      inactive: number;
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status <> 'active' OR status IS NULL)::int AS inactive
      FROM partners
    `);
  }

  async getServicesStats() {
    const summary = await this.db.queryOne<{
      catalog_total: number;
      catalog_active: number;
      catalog_inactive: number;
      deployed_total: number;
      deployed_active: number;
      deployed_inactive: number;
      total_token_used: number;
      recent_30d_tokens: number;
      partner_using_count: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM services) AS catalog_total,
        (SELECT COUNT(*)::int FROM services WHERE status = 'active') AS catalog_active,
        (SELECT COUNT(*)::int FROM services WHERE status <> 'active' OR status IS NULL) AS catalog_inactive,

        (SELECT COUNT(*)::int FROM partner_services) AS deployed_total,
        (SELECT COUNT(*)::int FROM partner_services WHERE status = 'active') AS deployed_active,
        (SELECT COUNT(*)::int FROM partner_services WHERE status <> 'active' OR status IS NULL) AS deployed_inactive,

        (SELECT COALESCE(SUM(token_used), 0)::int FROM partner_services) AS total_token_used,

        (
          SELECT COALESCE(SUM(tokens_used), 0)::int
          FROM token_transactions
          WHERE created_at >= NOW() - INTERVAL '30 days'
        ) AS recent_30d_tokens,

        (SELECT COUNT(DISTINCT partner_id)::int FROM partner_services) AS partner_using_count
    `);

    const topServices = await this.db.query<{
      id: string;
      name: string;
      type: string;
      partner_count: number;
      deployed_count: number;
      token_used: number;
    }>(`
      SELECT
        s.id,
        s.name,
        s.type,
        COUNT(DISTINCT ps.partner_id)::int AS partner_count,
        COUNT(ps.id)::int AS deployed_count,
        COALESCE(SUM(ps.token_used), 0)::int AS token_used
      FROM services s
      LEFT JOIN partner_services ps ON ps.service_id = s.id
      GROUP BY s.id, s.name, s.type
      ORDER BY token_used DESC, partner_count DESC, deployed_count DESC
      LIMIT 5
    `);

    return {
      ...summary,
      topServices,
    };
  }
}