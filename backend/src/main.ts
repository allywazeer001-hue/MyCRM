import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Disable built-in body parser so we can set a higher limit
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Gzip every response over ~1kb (compression's own default threshold) —
  // this app returns large JSON payloads (record lists, module/field
  // metadata) with no compression at all today, so this is a large,
  // essentially free reduction in transfer time for every request.
  app.use(compression());

  // Re-add body parsers with generous limit (email HTML + design JSON can be large).
  // `verify` stashes the exact raw bytes on req.rawBody — needed by webhook
  // signature checks (e.g. Meta's X-Hub-Signature-256) that must hash the
  // literal payload as sent, not a JSON.stringify() reconstruction of it.
  app.use(require('express').json({
    limit: '10mb',
    verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
  }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // Trust the Next.js rewrite proxy (see next.config.ts) as the one hop in front
  // of this server. Without this, Express's req.ip reflects whoever opened the
  // TCP socket — which is always the Next.js server process itself (loopback),
  // never the actual visitor's machine — so every client looked identical
  // (e.g. a public form submission from a different PC on the network would
  // record this machine's own address instead of the submitter's). With trust
  // proxy on, Express resolves req.ip from X-Forwarded-For, which Next.js's own
  // server already sets from the real socket remote address when nothing else
  // has (see base-server.js: req.headers['x-forwarded-for'] ??= socket.remoteAddress).
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Request logger — fires before guards/pipes
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[HTTP] ${req.method} ${req.url} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });

  // CORS: FRONTEND_URL can be a comma-separated list for multiple origins.
  // With Next.js rewrites the browser never calls the backend directly,
  // so CORS only matters for direct API access (dev tools, mobile apps, etc.).
  const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map(o => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-server requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Enterprise CRM/ERP API')
    .setDescription('Metadata-driven enterprise platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  // Bind to 0.0.0.0 so NestJS accepts connections from localhost, LAN, and production
  await app.listen(port, '0.0.0.0');
  console.log(`Application running on http://0.0.0.0:${port}`);
}
bootstrap();
