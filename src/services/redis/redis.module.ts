// redis.module.ts
import { Module, Global, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        // const logger = new Logger(RedisModule.name);
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          console.log('✅ Connecting to Redis using URL...');
          return new Redis(redisUrl, {
            retryStrategy: (times) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
          });
        }
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule implements OnModuleInit {
  // private readonly logger = new Logger(RedisModule.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    try {
      await this.redis.ping();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error(`❌ Redis connection failed: ${error.message}`);
    }
  }
}