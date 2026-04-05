import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async onModuleInit() {
    await this.pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  }

  async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  async queryOne<T = any>(
    text: string,
    params: any[] = [],
  ): Promise<T | null> {
  // async queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
    const result = await this.pool.query(text, params);
    return result.rows[0] ?? null;
  }
}