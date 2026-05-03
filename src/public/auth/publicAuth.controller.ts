import {
  Controller,
  Get,
  Query,
  Request,
  Body,
  Post,
  Req,
  Delete,
  Res,
} from '@nestjs/common';
import { CommonErrorHandlerMiddleware } from '../../common/common-error-handler.middleware';
import { PublicAuthService } from './publicAuth.service';
import { trace } from '@opentelemetry/api';

@Controller(['public/auth', 'v1/api/auth'])
export class PublicAuthController {
  constructor(
    private readonly publicAuthService: PublicAuthService,
    private errorHandler: CommonErrorHandlerMiddleware,
  ) {}

  @Post('/')
  async refundBooking(@Body() input: any, @Request() req: any) {
    if (input.idToken) {
      console.log(`Received idToken: ${input.idToken.substring(0, 50)}...`);
    }
    return this.publicAuthService.auth(input);
  }

  @Post('/cookies')
  async authResponseCookies(
    @Body() input: any,
    @Request() req: any,
    @Res() res: any,
  ) {
    try {
      const authResult = await this.publicAuthService.auth(input);
      const { accessToken } = authResult; // Lấy token từ kết quả

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true, //process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 3600 * 1000,
        path: '/',
      });

      return res.json({
        message: 'Authentication successful, token set in cookies',
      });
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }

  @Post('/forgot-password')
  async forgotPassword(@Body() input: any) {
    try {
      return await this.publicAuthService.forgotPassword(input);
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }

  @Post('/verify-reset-code')
  async verifyPasswordResetCode(@Body() input: any) {
    try {
      return await this.publicAuthService.verifyPasswordResetCode(input);
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }

  @Post('/reset-password')
  async resetPassword(@Body() input: any) {
    try {
      return await this.publicAuthService.resetPassword(input);
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }

  @Get('/inc-using-token')
  async testIncUsingToken(@Query() input: any, @Request() req: any) {
    try {
      input.uid = input.uid || 'tHShcFW7dEbyOnriYg7IZJyOPyj1';
      return await this.publicAuthService.testIncUsingToken(input);
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }

  @Get('/redis')
  async getAllTokensRedis(@Request() req: any) {
    try {
      return await this.publicAuthService.getAllTokensRedis();
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }

  @Delete('/redis')
  async delAllTokensRedis(@Request() req: any) {
    try {
      return await this.publicAuthService.delAllTokensRedis();
    } catch (error) {
      this.errorHandler.checkError(error);
    }
  }
}
