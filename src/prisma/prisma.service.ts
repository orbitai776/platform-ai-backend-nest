import { BeforeApplicationShutdown, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown {
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        const maxPoolSize = Number(process.env.PG_POOL_MAX ?? 5);

        const pool = new Pool({
            connectionString,
            max: Number.isFinite(maxPoolSize) && maxPoolSize > 0 ? maxPoolSize : 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        const adapter = new PrismaPg(pool);

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async beforeApplicationShutdown() {
        await this.$disconnect();
    }
}
