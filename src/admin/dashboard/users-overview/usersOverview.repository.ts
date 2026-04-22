import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../services/database/database.service';

@Injectable()
export class UsersOverviewRepository {
  constructor(private readonly db: DatabaseService) {}

  async getUsersStats() {
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
      FROM users
    `);
  }

  async getTopUsers() {
    return await this.db.query<{
      id: string;
      email: string;
      status: string;
      created_at: string;
    }>(`
      SELECT
        id,
        email,
        status,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);
  }
}
