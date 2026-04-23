import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { loadSsmConfig } from './common/ssm-config.service';

async function bootstrap() {
  await loadSsmConfig();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: ['http://localhost:5173', process.env.FRONTEND_URL!],
    credentials: true,
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

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running on http://localhost:3000`);
}
bootstrap();
