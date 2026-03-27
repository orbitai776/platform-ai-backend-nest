import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { TokenService } from '../token/token.service';
import { JwtService } from '../../services/jwt/jwt.service';
import { JWTPayload } from '../../services/jwt/jwt.interface';
 
// interface JWTPayload {
//     uid: string;
//     email?: string;
//     roles: string[];
//     [key: string]: any;
// }

// class JWTService {
//     private secretKey: string;
    
//     constructor() {
//         this.secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';
//     }
    
//     sign(payload: JWTPayload, options?: jwt.SignOptions): string {
//         const defaultOptions: jwt.SignOptions = {
//             expiresIn: '24h',
//             algorithm: 'HS256',
//             issuer: 'your-app-name',
//             audience: 'your-audience'
//         };
        
//         return jwt.sign(payload, this.secretKey, {
//             ...defaultOptions,
//             ...options
//         });
//     }
    
//     verify(token: string): JWTPayload {
//         try {
//             const decoded = jwt.verify(token, this.secretKey, {
//                 algorithms: ['HS256']
//             });
//             return decoded as JWTPayload;
//         } catch (error) {
//             if (error instanceof jwt.TokenExpiredError) {
//                 throw new Error('Token expired');
//             }
//             if (error instanceof jwt.JsonWebTokenError) {
//                 throw new Error('Invalid token');
//             }
//             throw error;
//         }
//     }
    
//     // Refresh token
//     refresh(oldToken: string): string {
//         const decoded = this.verify(oldToken);
//         // Remove iat and exp
//         const { iat, exp, ...payload } = decoded;
//         return this.sign(payload as JWTPayload);
//     }
// }

// // Sử dụng trong auth function
// const jwtService = new JWTService();

@Injectable()
export class PublicAuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
  ) {}
  
  auth = async (input: any) => {
    const { idToken } = input;
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);

    const jwtPayload: JWTPayload = {
      uid: decodedToken.uid,
      roles: ['user'],
      ...(decodedToken.email && { email: decodedToken.email }),
      ...(decodedToken.name && { name: decodedToken.name })
    };
    
    // Sign JWT
    const customAccessToken = this.jwtService.sign(jwtPayload);

    let tokenSaveToCache = {
      env: process.env.ENV || 'development',
      userId: decodedToken.uid,
      idToken: idToken,
      accessToken: customAccessToken,
      expiresIn: 3600,
      metadata: { deviceInfo: "defaultDevice", ipAddress: "0.0.0.0" }
    }

    await this.tokenService.saveToken(
      tokenSaveToCache.env,
      tokenSaveToCache.userId,
      tokenSaveToCache.idToken,
      tokenSaveToCache.accessToken,
      tokenSaveToCache.expiresIn,
      tokenSaveToCache.metadata
    );

    return {
      firebaseToken: idToken,
      accessToken: customAccessToken,
      decodedToken,
    }
  }

  getAllTokensRedis = async () => {
    const tokenCache = await this.tokenService.getAllTokens(
      process.env.ENV || 'development'
    );

    return tokenCache;
  }
}

