
import { Controller, Get, Query, Request, Body, Post, Req, Delete, Res } from '@nestjs/common';
import { CommonErrorHandlerMiddleware } from '../../common/common-error-handler.middleware';
import { PublicAuthService } from './publicAuth.service';
import { trace } from '@opentelemetry/api';

@Controller('public/auth')
export class PublicAuthController {
  constructor(
    private readonly publicAuthService: PublicAuthService,
    private errorHandler: CommonErrorHandlerMiddleware,
  ) {}

  @Post('/')
  async refundBooking(@Body() input:any, @Request() req: any) {
    const tracer = trace.getTracer('platform-ai-gateway');
    const span = tracer.startSpan('auth-flow');
    try {
      console.log(`Traceparent: ${req.headers['traceparent']}`);
      if (input.idToken) {
        console.log(`Received idToken: ...${input.idToken.slice(-10)}`);
        span.setAttribute('idFirebaseToken', `...${input.idToken.slice(-10)}`);
      }
      
      const authResult = await this.publicAuthService.auth(input);

      return authResult;
    } catch (error) {
      span.setAttribute('error', true);
      span.recordException(error as Error);
      this.errorHandler.checkError(error)
    } finally {
      span.end();
    }
  }

  @Post('/cookies')
  async authResponseCookies(@Body() input:any, @Request() req: any, @Res() res: any) {
    try {
      const authResult = await this.publicAuthService.auth(input);
      const { accessToken } = authResult; // Lấy token từ kết quả

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true,//process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 3600 * 1000,
        path: '/'
      });

      return res.json({ message: 'Authentication successful, token set in cookies' });
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }

  @Get('/inc-using-token')
  async testIncUsingToken(@Query() input: any, @Request() req: any) {
    try {
      input.uid = input.uid || 'tHShcFW7dEbyOnriYg7IZJyOPyj1';
      return await this.publicAuthService.testIncUsingToken(input);
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }

  @Get('/redis')
  async getAllTokensRedis(@Request() req: any) {
    try {
      return await this.publicAuthService.getAllTokensRedis();
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }

  @Delete('/redis')
  async delAllTokensRedis(@Request() req: any) {
    try {
      return await this.publicAuthService.delAllTokensRedis();
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }
}
