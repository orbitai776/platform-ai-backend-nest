import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../services/firebase/firebase.service';
 
@Injectable()
export class PublicAuthService {
  constructor(
    private readonly firebaseService: FirebaseService
  ) {}
  
  auth = async (input: any) => {
    const { idToken } = input;
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);

    return {
      accessToken: `mockedAccessToken from ${idToken}`,
      decodedToken,
    }
  }
}
