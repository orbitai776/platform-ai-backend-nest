// token/token.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../../services/redis/redis.module';
import { TokenService } from './token.service';

@Module({
  imports: [RedisModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}