import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createOtelSDK } from './services/otlp/otel';
import { TracingInterceptor } from './common/tracing/tracing.interceptor';

async function bootstrap() {
  const otelSDK = createOtelSDK('platform-ai-backend');
  if (otelSDK) {
    await otelSDK.start();
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global interceptor để trace tất cả request
  app.useGlobalInterceptors(new TracingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();