import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { JwtService, JWTPayload } from '../../services/jwt/jwt.service';

@Injectable()
export class PublicAuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
  ) {}

  async auth(input: any): Promise<any> {
    const { idToken } = input;
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);

    const jwtPayload: JWTPayload = {
      uid: decodedToken.uid,
      ...(decodedToken.email && { email: decodedToken.email }),
      ...(decodedToken.name && { name: decodedToken.name }),
      roles: ['user'],
    };

    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      decodedToken,
    };
  }
}