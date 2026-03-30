// token/token.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { UserUsingService } from './userUsing.service';

@Module({
  imports: [RedisModule],
  providers: [UserUsingService],
  exports: [UserUsingService],
})
export class UserUsingModule {}