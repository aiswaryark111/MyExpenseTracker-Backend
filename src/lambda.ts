import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import serverlessHttp from 'serverless-http';
import { loadSsmConfig } from './common/ssm-config.service';

let cachedServer: any;

async function bootstrap() {
  // Load secrets from SSM before anything else
  await loadSsmConfig();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://my-expense-tracker-liun.vercel.app',
        'https://d2fyxrldary745.cloudfront.net',
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('ExpenseIQ API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.init();
  return app;
}

export const handler = async (event: any, context: any) => {
  if (!cachedServer) {
    const app = await bootstrap();
    cachedServer = serverlessHttp(app.getHttpAdapter().getInstance());
  }
  return cachedServer(event, context);
};
