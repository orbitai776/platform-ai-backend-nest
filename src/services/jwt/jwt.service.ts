import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

export interface JWTPayload extends JwtPayload {
  uid: string;
  email?: string;
  name?: string;
  roles?: string[];
}

@Injectable()
export class JwtService {
  private readonly secretKey: Secret;
  private readonly expiresIn: SignOptions['expiresIn'];
  private readonly issuer?: string;
  private readonly audience?: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('JWT_SECRET_KEY');
    if (!secret) {
      throw new Error('JWT_SECRET_KEY is missing');
    }

    this.secretKey = secret;
    this.expiresIn =
      (this.configService.get<string>('JWT_EXPIRES_IN') as SignOptions['expiresIn']) ||
      '24h';
    this.issuer = this.configService.get<string>('JWT_ISSUER');
    this.audience = this.configService.get<string>('JWT_AUDIENCE');
  }

  sign(payload: JWTPayload): string {
    const options: SignOptions = {
      algorithm: 'HS256',
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(payload, this.secretKey, options);
  }

  verify(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secretKey, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as JWTPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}