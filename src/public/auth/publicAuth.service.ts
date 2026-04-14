import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { TokenService } from '../../services/token/token.service';
import { UserUsingService } from '../../services/userUsing/userUsing.service';
import { UserService } from '../../services/user/user.service';
import { JwtService } from '../../services/jwt/jwt.service';
import { JWTPayload } from '../../services/jwt/jwt.interface';

const defaultEnv = process.env.NODE_ENV || 'development';
const FE_ADMIN_EMAIL = [
  'orbitaifrontendadmin@gmail.com',
  'trankyhoathanh.1992@gmail.com',
  'phongongp121@gmail.com',
  'hieuh5982@gmail.com',
  'lecongnguyen213@gmail.com',
  'luanhhao491@gmail.com',
].map(email => email.toLowerCase());

@Injectable()
export class PublicAuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tokenService: TokenService,
    private readonly userUsingService: UserUsingService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async auth(input: any): Promise<any> {
    const { idToken } = input;
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);
    
    const tokenCache = await this.tokenService.getToken(
      defaultEnv,
      decodedToken.uid,
    );

    let userUsingCache = await this.userUsingService.getUserUsing(
      defaultEnv,
      decodedToken.uid,
    );

    if (tokenCache) {
      return {
        accessToken: tokenCache.accessToken,
        userUsingCache,
      };
    }

    const user = await this.userService.checkAndCreateUser({
      user_id: decodedToken.uid,
      name: decodedToken.name,
      email: decodedToken.email,
      picture: decodedToken.picture,
    });

    const roles: string[] = ['user', 'partner'];
    if (user.data.email && FE_ADMIN_EMAIL.includes(user.data.email.toLowerCase())) {
      roles.push('admin');
    }

    const jwtPayload: JWTPayload = {
      uid: user.data.id,
      roles,
      ...(user.data.email && { email: user.data.email }),
      ...(user.data.full_name && { name: user.data.full_name }),
      ...(user.data.full_name && { full_name: user.data.full_name }),
    };

    const customAccessToken = this.jwtService.sign(jwtPayload);

    const tokenSaveToCache = {
      env: defaultEnv,
      userId: user.data.id,
      idToken,
      accessToken: customAccessToken,
      expiresIn: 24 * 3600,
      metadata: {
        deviceInfo: 'defaultDevice',
        ipAddress: '0.0.0.0',
      },
    };

    await this.tokenService.saveToken(
      tokenSaveToCache.env,
      tokenSaveToCache.userId,
      tokenSaveToCache.idToken,
      tokenSaveToCache.accessToken,
      tokenSaveToCache.expiresIn,
      tokenSaveToCache.metadata,
    );

    if (!userUsingCache) {
      await this.userUsingService.saveUserUsing(
        defaultEnv,
        decodedToken.uid,
        tokenSaveToCache.expiresIn,
      );

      userUsingCache = await this.userUsingService.getUserUsing(
        defaultEnv,
        decodedToken.uid,
      );
    }

    return {
      accessToken: customAccessToken,
      userUsingCache,
    };
  }

  async testIncUsingToken(input: any): Promise<any> {
    const { uid } = input;

    const tokenCache = await this.tokenService.getToken(defaultEnv, uid);
    if (!tokenCache) {
      return { accessToken: null };
    }

    const currentUsingToken = await this.userUsingService.incrementUsingToken(
      defaultEnv,
      uid,
      10,
    );

    return { currentUsingToken };
  }

  async getAllTokensRedis(): Promise<any> {
    const tokenuid = await this.tokenService.getAllTokens(defaultEnv);
    const tokenUsing = await this.tokenService.getAllUserInfo(defaultEnv);

    return {
      tokenuid,
      tokenUsing,
    };
  }

  async delAllTokensRedis(): Promise<any> {
    const deleteCount = await this.tokenService.deleteAllTokens(defaultEnv);
    return { deletedCount: deleteCount };
  }
}
