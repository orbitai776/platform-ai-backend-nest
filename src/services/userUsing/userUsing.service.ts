// token.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UserUsingService {
  private readonly logger = new Logger(UserUsingService.name);

  constructor(private readonly redisService: RedisService) {}

  private buildUserUsingKey(env: string, userId: string): string {
    return `${env}:userinfo:${userId}`;
  }

  async saveUserUsing(
      env: string,
      userId: string,
      expiresIn: number = 3600,
    ): Promise<void> {
      const keyUsing = this.buildUserUsingKey(env, userId);
      await this.redisService.hsetex(keyUsing, 'usingToken', expiresIn, '0');
      await this.redisService.hsetex(keyUsing, 'maxToken', expiresIn, '1000');
      
      this.logger.log(`User using saved: ${keyUsing}, expires in ${expiresIn}s`);
    }

  
  async incrementUsingToken(env: string, userId: string, increment: number): Promise<number> {
    const key = this.buildUserUsingKey(env, userId);
    console.log(`Incrementing usingToken for key: ${key} by ${increment}`);
    return await this.redisService.hincrby(key, 'usingToken', increment);
  }

  async getUserUsing(env: string, userId: string) {
    const key = this.buildUserUsingKey(env, userId);
    const data = await this.redisService.hgetall(key);

    if (!data || Object.keys(data).length === 0) return null;

    return {
      usingToken: Number(data.usingToken),
      maxToken: Number(data.maxToken),
    }
  }
}