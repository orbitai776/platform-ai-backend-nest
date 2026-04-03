import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { TokenService } from '../../services/token/token.service';
import { UserUsingService } from '../../services/userUsing/userUsing.service';
import { JwtService } from '../../services/jwt/jwt.service';
import { JWTPayload } from '../../services/jwt/jwt.interface';

@Injectable()
export class PublicAuthService {
  private readonly defaultEnv: string;
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tokenService: TokenService,
    private readonly userUsingService: UserUsingService,
    private readonly jwtService: JwtService,
  ) {
    this.defaultEnv = process.env.ENV || 'development';
  }
  
  auth = async (input: any) => {
    const { idToken } = input;
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);

    const tokenCache = await this.tokenService.getToken(this.defaultEnv, decodedToken.uid);
    let userUsingCache = await this.userUsingService.getUserUsing(
      this.defaultEnv,
      decodedToken.uid
    )

    if (tokenCache) {
      return {
        accessToken: tokenCache.accessToken,
        userUsingCache,
      }
    }

    const jwtPayload: JWTPayload = {
      uid: decodedToken.uid,
      roles: ['user'],
      ...(decodedToken.email && { email: decodedToken.email }),
      ...(decodedToken.name && { name: decodedToken.name })
    };
    
    // Sign JWT
    const customAccessToken = this.jwtService.sign(jwtPayload);

    let tokenSaveToCache = {
      env: this.defaultEnv,
      userId: decodedToken.uid,
      idToken: idToken,
      accessToken: customAccessToken,
      expiresIn: 24 * 3600,//decodedToken.exp - Math.floor(Date.now() / 1000),
      metadata: {
        deviceInfo: "defaultDevice",
        ipAddress: "0.0.0.0",
      }
    }

    await this.tokenService.saveToken(
      tokenSaveToCache.env,
      tokenSaveToCache.userId,
      tokenSaveToCache.idToken,
      tokenSaveToCache.accessToken,
      tokenSaveToCache.expiresIn,
      tokenSaveToCache.metadata
    );

    if (!userUsingCache) {
      await this.userUsingService.saveUserUsing(
        this.defaultEnv,
        decodedToken.uid,
        tokenSaveToCache.expiresIn
      );
      userUsingCache = await this.userUsingService.getUserUsing(
        this.defaultEnv,
        decodedToken.uid
      );
    }

    return {
      accessToken: customAccessToken,
      userUsingCache
    }
  }

  testIncUsingToken = async (input: any) => {
    const { uid } = input;
    const tokenCache = await this.tokenService.getToken(
      this.defaultEnv,
      uid
    );
    if (!tokenCache) {
      return {
        accessToken: null,
      }
    }
    const currentUsingToken = await this.userUsingService.incrementUsingToken(this.defaultEnv, uid, 10);
    return { currentUsingToken };
  }

  getAllTokensRedis = async () => {
    console.log(`Env: ${this.defaultEnv}`);
    const tokenuid = await this.tokenService.getAllTokens(
      this.defaultEnv
    );

    const tokenUsing = await this.tokenService.getAllUserInfo(
      this.defaultEnv
    );

    const result = {
      tokenuid,
      tokenUsing,
    }

    return result;
  }

  delAllTokensRedis = async () => {
    const deleteCount = await this.tokenService.deleteAllTokens(
      this.defaultEnv
    );

    return { deletedCount: deleteCount };
  }
}

