import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JWTPayload } from './jwt.interface';
import type { StringValue } from 'ms';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly secretKey: string;
  private readonly defaultExpiresIn: string | StringValue;
  private readonly defaultIssuer: string;
  private readonly defaultAudience: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('JWT_SECRET_KEY') || 'your-secret-key';
    this.defaultExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
    this.defaultIssuer =
      this.configService.get<string>('JWT_ISSUER') || 'platform-ai-backend';
    this.defaultAudience =
      this.configService.get<string>('JWT_AUDIENCE') ||
      'platform-ai-backend-audience';
  }

  sign(payload: JWTPayload, options?: jwt.SignOptions): string {
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );

    return jwt.sign(cleanPayload, this.secretKey, {
      expiresIn: this.defaultExpiresIn as number | StringValue,
      algorithm: 'HS256',
      issuer: this.defaultIssuer,
      audience: this.defaultAudience,
      ...options,
    });
  }

  verify(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secretKey, {
        algorithms: ['HS256'],
        issuer: this.defaultIssuer,
        audience: this.defaultAudience,
      }) as JWTPayload;
    } catch (error) {
      this.logger.warn('Invalid or expired token');
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}