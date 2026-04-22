import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../services/database/database.service';

@Injectable()
export class PartnersOverviewRepository {
  constructor(private readonly db: DatabaseService) {}

  async getPartnersStats() {
    return await this.db.queryOne<{
      total: number;
      active: number;
      inactive: number;
      new_last_30d: number;
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status <> 'active' OR status IS NULL)::int AS inactive,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_last_30d
      FROM partners
    `);
  }

  async getTopPartners() {
    return await this.db.query<{
      id: string;
      name: string;
      status: string;
      service_count: number;
      total_token_used: number;
    }>(`
      SELECT
        p.id,
        p.name,
        p.status,
        COUNT(ps.id)::int AS service_count,
        COALESCE(SUM(ps.token_used), 0)::int AS total_token_used
      FROM partners p
      LEFT JOIN partner_services ps ON ps.partner_id = p.id
      GROUP BY p.id, p.name, p.status
      ORDER BY total_token_used DESC, service_count DESC
      LIMIT 5
    `);
  }
}
