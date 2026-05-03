// firebase.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      throw new UnauthorizedException('User not found');
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        return null;
      }

      throw new InternalServerErrorException('Khong the kiem tra email');
    }
  }

  async updateUserPassword(uid: string, password: string): Promise<void> {
    try {
      await admin.auth().updateUser(uid, { password });
      await admin.auth().revokeRefreshTokens(uid);
    } catch (error: any) {
      if (error?.code === 'auth/weak-password') {
        throw new BadRequestException('Mat khau phai co it nhat 6 ky tu');
      }

      if (error?.code === 'auth/user-not-found') {
        throw new BadRequestException('Tai khoan khong ton tai');
      }

      throw new InternalServerErrorException('Khong the cap nhat mat khau');
    }
  }

  async sendPasswordResetEmail(email: string, locale = 'vi'): Promise<void> {
    const apiKey = this.getWebApiKey();

    try {
      await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          requestType: 'PASSWORD_RESET',
          email,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Firebase-Locale': locale,
          },
        },
      );
    } catch (error) {
      const code = this.getFirebaseRestErrorCode(error);

      if (code === 'EMAIL_NOT_FOUND') {
        return;
      }

      if (code === 'INVALID_EMAIL') {
        throw new BadRequestException('Email khong hop le');
      }

      if (code === 'OPERATION_NOT_ALLOWED') {
        throw new BadRequestException(
          'Email/password sign-in chua duoc bat trong Firebase',
        );
      }

      throw new InternalServerErrorException(
        'Khong the gui email dat lai mat khau',
      );
    }
  }

  async verifyPasswordResetCode(oobCode: string): Promise<{ email: string }> {
    const apiKey = this.getWebApiKey();

    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`,
        { oobCode },
      );

      return { email: response.data.email };
    } catch (error) {
      throw this.mapPasswordResetError(error);
    }
  }

  async confirmPasswordReset(
    oobCode: string,
    newPassword: string,
  ): Promise<{ email: string }> {
    const apiKey = this.getWebApiKey();

    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`,
        {
          oobCode,
          newPassword,
        },
      );

      return { email: response.data.email };
    } catch (error) {
      throw this.mapPasswordResetError(error);
    }
  }

  private getWebApiKey(): string {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'FIREBASE_WEB_API_KEY is not configured',
      );
    }

    return apiKey;
  }

  private getFirebaseRestErrorCode(error: any): string | undefined {
    return error?.response?.data?.error?.message;
  }

  private mapPasswordResetError(error: any): BadRequestException {
    const code = this.getFirebaseRestErrorCode(error);

    if (code === 'EXPIRED_OOB_CODE') {
      return new BadRequestException('Ma dat lai mat khau da het han');
    }

    if (code === 'INVALID_OOB_CODE') {
      return new BadRequestException('Ma dat lai mat khau khong hop le');
    }

    if (code === 'WEAK_PASSWORD') {
      return new BadRequestException('Mat khau phai co it nhat 6 ky tu');
    }

    if (code === 'USER_DISABLED') {
      return new BadRequestException('Tai khoan da bi vo hieu hoa');
    }

    return new BadRequestException('Khong the dat lai mat khau');
  }
}
