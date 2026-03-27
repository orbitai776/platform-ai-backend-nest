// modules/jwt/jwt.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JWTPayload, JWTSignOptions } from './jwt.interface';
import type { StringValue } from "ms";

@Injectable()
export class JwtService {
    private readonly logger = new Logger(JwtService.name);
    private readonly secretKey: string;
    private readonly defaultExpiresIn: string | StringValue;
    private readonly defaultIssuer: string;
    private readonly defaultAudience: string;

    constructor() {
        // Lấy config từ environment variables
        this.secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';
        this.defaultExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.defaultIssuer = process.env.JWT_ISSUER || 'your-app-name';
        this.defaultAudience = process.env.JWT_AUDIENCE || 'your-audience';

        if (!this.secretKey || this.secretKey === 'your-secret-key') {
            this.logger.warn('JWT_SECRET_KEY is not set in environment variables. Using default key. This is not secure for production!');
        }
    }

    /**
     * Sign JWT token
     */
    sign(payload: JWTPayload, options?: jwt.SignOptions): string {
        const defaultOptions: jwt.SignOptions = {
            expiresIn: this.defaultExpiresIn as number | StringValue,
            algorithm: 'HS256',
            issuer: this.defaultIssuer,
            audience: this.defaultAudience
        };

        // Clean payload: remove undefined values
        const cleanPayload = Object.fromEntries(
            Object.entries(payload).filter(([_, value]) => value !== undefined)
        );

        try {
            const token = jwt.sign(cleanPayload, this.secretKey, {
                ...defaultOptions,
                ...options
            });
            
            this.logger.debug(`JWT signed successfully for user: ${payload.uid}`);
            return token;
        } catch (error) {
            this.logger.error(`Failed to sign JWT: ${error.message}`);
            throw new Error(`JWT signing failed: ${error.message}`);
        }
    }

    /**
     * Verify JWT token
     */
    verify(token: string): JWTPayload {
        try {
            const decoded = jwt.verify(token, this.secretKey, {
                algorithms: ['HS256']
            });
            
            this.logger.debug('JWT verified successfully');
            return decoded as JWTPayload;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                this.logger.warn('JWT token expired');
                throw new Error('Token expired');
            }
            if (error instanceof jwt.JsonWebTokenError) {
                this.logger.warn(`Invalid JWT token: ${error.message}`);
                throw new Error('Invalid token');
            }
            this.logger.error(`JWT verification failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Refresh JWT token
     */
    refresh(oldToken: string, additionalPayload?: Partial<JWTPayload>): string {
        try {
            const decoded = this.verify(oldToken);
            // Remove iat, exp, and other internal claims
            const { iat, exp, aud, iss, sub, ...payload } = decoded;
            
            // Merge with additional payload if provided
            const newPayload: JWTPayload = {
                ...payload,
                ...additionalPayload
            };
            
            const newToken = this.sign(newPayload);
            this.logger.debug(`JWT refreshed successfully for user: ${payload.uid}`);
            return newToken;
        } catch (error) {
            this.logger.error(`Failed to refresh JWT: ${error.message}`);
            throw error;
        }
    }

    /**
     * Decode JWT without verification (for debugging only)
     */
    decode(token: string): JWTPayload | null {
        try {
            const decoded = jwt.decode(token);
            return decoded as JWTPayload | null;
        } catch (error) {
            this.logger.error(`Failed to decode JWT: ${error.message}`);
            return null;
        }
    }

    /**
     * Get token expiration time
     */
    getTokenExpiration(token: string): Date | null {
        try {
            const decoded = jwt.decode(token) as any;
            if (decoded && decoded.exp) {
                return new Date(decoded.exp * 1000);
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to get token expiration: ${error.message}`);
            return null;
        }
    }
}