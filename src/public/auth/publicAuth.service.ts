import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { TokenService } from '../../services/token/token.service';
import { UserUsingService } from '../../services/userUsing/userUsing.service';
import { UserService } from '../../services/user/user.service';
import { JwtService } from '../../services/jwt/jwt.service';
import { JWTPayload } from '../../services/jwt/jwt.interface';
import { RedisService } from '../../services/redis/redis.service';

const defaultEnv = process.env.NODE_ENV || 'development';
const FE_ADMIN_EMAIL = [
  'orbitaifrontendadmin@gmail.com',
  'trankyhoathanh.1992@gmail.com',
  'phongongp121@gmail.com',
  'hieuh5982@gmail.com',
  'lecongnguyen213@gmail.com',
  'luanhhao491@gmail.com',
  'tinh87973@gmail.com',
  'huynhthequanghuynhthequang29102004@gmail.com'
].map(email => email.toLowerCase());

interface PasswordResetPayload {
  email: string;
  uid: string;
  codeHash: string;
  attempts: number;
  verified: boolean;
  createdAt: string;
}

@Injectable()
export class PublicAuthService {
  private readonly resetCodeTtlSeconds = Number(
    process.env.PASSWORD_RESET_CODE_TTL_SECONDS || 10 * 60,
  );
  private readonly maxResetCodeAttempts = Number(
    process.env.PASSWORD_RESET_MAX_ATTEMPTS || 5,
  );

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tokenService: TokenService,
    private readonly userUsingService: UserUsingService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
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

  async forgotPassword(input: any): Promise<any> {
    const email = this.normalizeEmail(input?.email);
    const user = await this.firebaseService.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Email chua duoc dang ky');
    }

    if (user.disabled) {
      throw new BadRequestException('Tai khoan da bi vo hieu hoa');
    }

    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const resetToken = randomUUID();
    const payload: PasswordResetPayload = {
      email,
      uid: user.uid,
      codeHash: this.hashResetCode(resetToken, code),
      attempts: 0,
      verified: false,
      createdAt: new Date().toISOString(),
    };

    await this.redisService.setex(
      this.getResetKey(resetToken),
      this.resetCodeTtlSeconds,
      JSON.stringify(payload),
    );

    let emailSent = false;
    try {
      emailSent = await this.sendResetCodeEmail(email, code);
    } catch (error) {
      await this.redisService.del(this.getResetKey(resetToken));
      throw error;
    }

    return {
      resetToken,
      expiresIn: this.resetCodeTtlSeconds,
      emailSent,
      ...(this.shouldExposeDevResetCode() && !emailSent ? { devCode: code } : {}),
      message: emailSent
        ? 'Ma xac nhan da duoc gui den email.'
        : 'SMTP chua cau hinh. Ma xac nhan chi duoc hien trong moi truong dev.',
    };
  }

  async verifyPasswordResetCode(input: any): Promise<any> {
    const resetToken = this.requireString(input?.resetToken, 'resetToken');
    const code = this.requireCode(input?.code);
    const { key, payload, ttl } = await this.getActiveResetPayload(resetToken);

    if (payload.attempts >= this.maxResetCodeAttempts) {
      await this.redisService.del(key);
      throw new BadRequestException('Ban da nhap sai qua nhieu lan');
    }

    if (payload.codeHash !== this.hashResetCode(resetToken, code)) {
      payload.attempts += 1;
      await this.redisService.setex(key, ttl, JSON.stringify(payload));
      throw new BadRequestException('Ma xac nhan khong dung');
    }

    payload.verified = true;
    await this.redisService.setex(key, ttl, JSON.stringify(payload));

    return {
      resetToken,
      email: payload.email,
      message: 'Ma xac nhan hop le.',
    };
  }

  async resetPassword(input: any): Promise<any> {
    const resetToken = this.requireString(input?.resetToken, 'resetToken');
    const newPassword = this.requireString(input?.newPassword, 'newPassword');
    const confirmPassword =
      typeof input?.confirmPassword === 'string'
        ? input.confirmPassword.trim()
        : undefined;

    if (confirmPassword && confirmPassword !== newPassword) {
      throw new BadRequestException('Mat khau xac nhan khong khop');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Mat khau phai co it nhat 8 ky tu');
    }

    const { key, payload } = await this.getActiveResetPayload(resetToken);

    if (!payload.verified) {
      throw new BadRequestException('Vui long xac minh ma truoc khi doi mat khau');
    }

    await this.firebaseService.updateUserPassword(payload.uid, newPassword);
    await this.redisService.del(key);

    return {
      email: payload.email,
      message: 'Dat lai mat khau thanh cong.',
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

  private normalizeEmail(email: any): string {
    const value = this.requireString(email, 'email').toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value)) {
      throw new BadRequestException('Email khong hop le');
    }

    return value;
  }

  private requireString(value: any, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} la bat buoc`);
    }

    return value.trim();
  }

  private requireCode(value: any): string {
    const code = this.requireString(value, 'code');

    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Ma xac nhan phai gom 6 chu so');
    }

    return code;
  }

  private getResetKey(resetToken: string): string {
    return `${defaultEnv}:password-reset:${resetToken}`;
  }

  private hashResetCode(resetToken: string, code: string): string {
    const secret =
      process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || 'orbit-ai';

    return createHash('sha256')
      .update(`${resetToken}:${code}:${secret}`)
      .digest('hex');
  }

  private async getActiveResetPayload(resetToken: string): Promise<{
    key: string;
    payload: PasswordResetPayload;
    ttl: number;
  }> {
    const key = this.getResetKey(resetToken);
    const rawPayload = await this.redisService.get(key);

    if (!rawPayload) {
      throw new BadRequestException('Ma xac nhan da het han hoac khong ton tai');
    }

    const ttl = await this.redisService.ttl(key);
    if (ttl <= 0) {
      await this.redisService.del(key);
      throw new BadRequestException('Ma xac nhan da het han');
    }

    try {
      return {
        key,
        payload: JSON.parse(rawPayload) as PasswordResetPayload,
        ttl,
      };
    } catch (error) {
      await this.redisService.del(key);
      throw new BadRequestException('Phien dat lai mat khau khong hop le');
    }
  }

  private shouldExposeDevResetCode(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private async sendResetCodeEmail(
    email: string,
    code: string,
  ): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!host || !from) {
      if (this.shouldExposeDevResetCode()) {
        return false;
      }

      throw new InternalServerErrorException('SMTP chua duoc cau hinh');
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const appName = process.env.APP_NAME || 'Orbit AI';
    const subject = `${appName} password reset code`;
    const text = [
      `Your ${appName} password reset code is ${code}.`,
      `This code expires in ${Math.floor(this.resetCodeTtlSeconds / 60)} minutes.`,
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
        <h2>${this.escapeHtml(appName)} password reset</h2>
        <p>Your verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>This code expires in ${Math.floor(this.resetCodeTtlSeconds / 60)} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `;

    await this.sendSmtpMail({
      host,
      port,
      secure,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from,
      to: email,
      subject,
      text,
      html,
    });

    return true;
  }

  private async sendSmtpMail(options: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    let socket: net.Socket | tls.TLSSocket = options.secure
      ? tls.connect({
          host: options.host,
          port: options.port,
          servername: options.host,
        })
      : net.connect(options.port, options.host);

    socket.setEncoding('utf8');
    let buffer = '';

    const waitForResponse = (expectedCodes: number[]) =>
      new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('SMTP timeout'));
        }, 15000);

        const cleanup = () => {
          clearTimeout(timeout);
          socket.off('data', onData);
          socket.off('error', onError);
        };

        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        const onData = (chunk: string | Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split(/\r?\n/).filter(Boolean);
          const lastLine = lines[lines.length - 1];

          if (!lastLine || !/^\d{3} /.test(lastLine)) {
            return;
          }

          const code = Number(lastLine.slice(0, 3));
          const response = buffer;
          buffer = '';
          cleanup();

          if (expectedCodes.includes(code)) {
            resolve(response);
            return;
          }

          reject(new Error(response));
        };

        socket.on('data', onData);
        socket.once('error', onError);
      });

    const sendCommand = async (command: string, expectedCodes: number[]) => {
      socket.write(`${command}\r\n`);
      return waitForResponse(expectedCodes);
    };

    try {
      await waitForResponse([220]);
      await sendCommand('EHLO orbit-ai.local', [250]);

      if (!options.secure && process.env.SMTP_STARTTLS !== 'false') {
        await sendCommand('STARTTLS', [220]);
        socket = tls.connect({
          socket,
          servername: options.host,
        });
        socket.setEncoding('utf8');
        buffer = '';
        await new Promise<void>((resolve, reject) => {
          socket.once('secureConnect', resolve);
          socket.once('error', reject);
        });
        await sendCommand('EHLO orbit-ai.local', [250]);
      }

      if (options.user && options.pass) {
        const authPlain = Buffer.from(
          `\u0000${options.user}\u0000${options.pass}`,
        ).toString('base64');
        await sendCommand(`AUTH PLAIN ${authPlain}`, [235]);
      }

      await sendCommand(`MAIL FROM:<${this.extractEmail(options.from)}>`, [250]);
      await sendCommand(`RCPT TO:<${options.to}>`, [250, 251]);
      await sendCommand('DATA', [354]);
      socket.write(`${this.buildEmailMessage(options)}\r\n.\r\n`);
      await waitForResponse([250]);
      await sendCommand('QUIT', [221]).catch(() => undefined);
    } catch (error) {
      throw new InternalServerErrorException('Khong the gui ma xac nhan');
    } finally {
      socket.end();
    }
  }

  private buildEmailMessage(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): string {
    const boundary = `orbit-ai-${randomUUID()}`;
    const encodedSubject = Buffer.from(options.subject, 'utf8').toString(
      'base64',
    );
    const message = [
      `From: ${options.from}`,
      `To: ${options.to}`,
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.text,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.html,
      '',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    return message.replace(/^\./gm, '..');
  }

  private extractEmail(value: string): string {
    const match = value.match(/<([^>]+)>/);
    return (match?.[1] || value).trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
