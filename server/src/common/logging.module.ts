// 结构化日志 + Sentry 错误聚合
// 1. nestjs-pino：替换 Nest 默认 logger，输出 JSON / pretty 格式
// 2. Sentry SDK（可选，DSN 设了就初始化）：
//    - 捕获 unhandled error / unhandledRejection
//    - request breadcrumbs
//    - 用户上下文
// 3. request-id：每个请求生成 UUID，用于追踪跨服务日志

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// === Sentry 可选初始化（用 dynamic import 避免无 DSN 时报错）===
let Sentry: any = null;
let sentryReady = false;
async function initSentry(dsn: string) {
  if (!dsn) return;
  try {
    Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.2,           // 20% 性能追踪
      profilesSampleRate: 0.2,
      release: process.env.SENTRY_RELEASE || undefined,
      // 过滤：不发到 Sentry 的本地健康检查
      beforeSendTransaction(event: any) {
        if (event.transaction === 'GET /health') return null;
        return event;
      },
    });
    sentryReady = true;

    // 进程级兜底：unhandledRejection + uncaughtException 上报 Sentry
    process.on('unhandledRejection', (reason: any) => {
      // eslint-disable-next-line no-console
      console.error('[unhandledRejection]', reason);
      try { Sentry?.captureException(reason); } catch {}
    });
    process.on('uncaughtException', (err: Error) => {
      // eslint-disable-next-line no-console
      console.error('[uncaughtException]', err);
      try { Sentry?.captureException(err); } catch {}
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[sentry] init failed:', e);
  }
}

// === request-id 中间件 ===
function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // 生产默认 JSON，开发默认 pretty；CI 模式也 JSON
        level: process.env.LOG_LEVEL
          || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport: process.env.NODE_ENV === 'production' || process.env.CI
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } },
        // 注入 request-id 到每条日志
        genReqId: (req: any) => req.id,
        // 自定义 request 字段
        customProps: (req: any) => ({
          userId: req.user?.id || null,
          sentry: sentryReady,
        }),
        // 敏感字段脱敏
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.password_hash'],
          remove: false,
        },
        // 响应分级：5xx→error，4xx→warn，3xx→info，
        // 慢请求：>1s→warn，>3s→error
        customLogLevel: (req: any, res: any, err: any) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          if (res.statusCode >= 300) return 'info';
          const ms = Date.now() - (req as any).startTime;
          if (ms > 3000) return 'error';
          if (ms > 1000) return 'warn';
          return 'info';
        },
        customSuccessMessage: (req: any, res: any) =>
          `${req.method} ${req.url} ${res.statusCode}`,
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule implements NestModule {
  constructor() {
    // 异步初始化 Sentry（不阻塞）
    initSentry(process.env.SENTRY_DSN || '').catch(() => {});
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestId).forRoutes('*');
  }
}

// 进程级 unhandled 错误 → Sentry（如果启用）
// 注意：在 initSentry 完成后才挂，否则 Sentry 还是 null
process.on('unhandledRejection', (reason: any) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
  if (Sentry?.captureException) {
    Sentry.captureException(reason);
  }
});
process.on('uncaughtException', (err: Error) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException]', err);
  if (Sentry?.captureException) {
    Sentry.captureException(err);
  }
});

// 导出 Sentry 实例供业务模块使用（如有需要）
export { Sentry };

