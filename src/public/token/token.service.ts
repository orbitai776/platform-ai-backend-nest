// token.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisService } from '../../services/redis/redis.service';

export interface TokenData {
  idToken: string;        // Firebase ID Token
  accessToken: string;     // JWT nội bộ
  createdAt: number;       // Timestamp tạo
  expiresAt: number;       // Timestamp hết hạn
  usageCount: number;      // Số lần sử dụng
  lastUsedAt: number;      // Lần cuối sử dụng
  deviceInfo?: string;
  ipAddress?: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Build key: {env}:{userId}
   */
  private buildKey(env: string, userId: string): string {
    return `${env}:${userId}`;
  }

  /**
   * Lưu token - key: env:userId, value: JSON token data
   */
  async saveToken(
    env: string,
    userId: string,
    idToken: string,
    accessToken: string,
    expiresIn: number = 3600,
    metadata?: { deviceInfo?: string; ipAddress?: string },
  ): Promise<void> {
    const now = Date.now();
    const tokenData: TokenData = {
      idToken,
      accessToken,
      createdAt: now,
      expiresAt: now + expiresIn * 1000,
      usageCount: 0,
      lastUsedAt: now,
      ...metadata,
    };

    const key = this.buildKey(env, userId);
    await this.redisService.setex(key, expiresIn, JSON.stringify(tokenData));
    
    this.logger.log(`Token saved: ${key}, expires in ${expiresIn}s`);
  }

  /**
   * Lấy token data
   */
  async getToken(env: string, userId: string): Promise<TokenData | null> {
    const key = this.buildKey(env, userId);
    const data = await this.redisService.get(key);

    if (!data) return null;

    try {
      const tokenData: TokenData = JSON.parse(data);
      
      // Check expired
      if (tokenData.expiresAt < Date.now()) {
        await this.deleteToken(env, userId);
        return null;
      }

      return tokenData;
    } catch (error) {
      this.logger.error(`Failed to parse token for key: ${key}`);
      return null;
    }
  }

  /**
   * Verify token và tăng usage
   */
  async verifyToken(env: string, userId: string, accessToken: string): Promise<boolean> {
    const tokenData = await this.getToken(env, userId);
    
    if (!tokenData) return false;
    if (tokenData.accessToken !== accessToken) return false;
    if (tokenData.expiresAt < Date.now()) {
      await this.deleteToken(env, userId);
      return false;
    }

    // Tăng usage count
    tokenData.usageCount += 1;
    tokenData.lastUsedAt = Date.now();
    
    // Update lại với TTL mới
    const key = this.buildKey(env, userId);
    const remainingTTL = Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000));
    await this.redisService.setex(key, remainingTTL, JSON.stringify(tokenData));
    
    return true;
  }

  /**
   * Tăng usage count (atomic)
   */
  async incrementUsage(env: string, userId: string): Promise<number> {
    const key = this.buildKey(env, userId);
    const tokenData = await this.getToken(env, userId);
    
    if (!tokenData) return 0;
    
    tokenData.usageCount += 1;
    tokenData.lastUsedAt = Date.now();
    
    const remainingTTL = Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000));
    await this.redisService.setex(key, remainingTTL, JSON.stringify(tokenData));
    
    return tokenData.usageCount;
  }

  /**
   * Lấy usage count
   */
  async getUsageCount(env: string, userId: string): Promise<number> {
    const tokenData = await this.getToken(env, userId);
    return tokenData?.usageCount || 0;
  }

  /**
   * Refresh token
   */
  async refreshToken(
    env: string,
    userId: string,
    newAccessToken: string,
    expiresIn: number = 3600,
  ): Promise<boolean> {
    const tokenData = await this.getToken(env, userId);
    
    if (!tokenData) return false;

    tokenData.accessToken = newAccessToken;
    tokenData.expiresAt = Date.now() + expiresIn * 1000;
    tokenData.lastUsedAt = Date.now();

    const key = this.buildKey(env, userId);
    await this.redisService.setex(key, expiresIn, JSON.stringify(tokenData));
    
    return true;
  }

  /**
   * Delete token
   */
  async deleteToken(env: string, userId: string): Promise<void> {
    const key = this.buildKey(env, userId);
    await this.redisService.del(key);
    this.logger.log(`Token deleted: ${key}`);
  }

  /**
   * Get all tokens by env
   */
  async getAllTokens(env: string): Promise<Record<string, TokenData>> {
    const pattern = `${env}:*`;
    const keys = await this.redisService.keys(pattern);
    const result: Record<string, TokenData> = {};

    for (const key of keys) {
      const data = await this.redisService.get(key);
      if (data) {
        try {
          const userId = key.replace(`${env}:`, '');
          const tokenData: TokenData = JSON.parse(data);
          if (tokenData.expiresAt > Date.now()) {
            result[userId] = tokenData;
          }
        } catch (error) {
          this.logger.error(`Failed to parse token for key: ${key}`);
        }
      }
    }

    return result;
  }

  /**
   * Delete all tokens by env
   */
  async clearEnv(env: string): Promise<number> {
    const pattern = `${env}:*`;
    const keys = await this.redisService.keys(pattern);
    if (keys.length === 0) return 0;
    
    for (const key of keys) {
      await this.redisService.del(key);
    }
    
    this.logger.log(`Cleared ${keys.length} tokens for env: ${env}`);
    return keys.length;
  }
}