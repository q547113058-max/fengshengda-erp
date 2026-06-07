// 简单结构化 HTTP 访问日志 — 不打印 body（防敏感数据泄漏）
// 鉴权 / 限流 / body 脱敏都走 nestjs-pino + LoggingInterceptor
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: Logger) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, params, query } = req;
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        // 不打印 body / headers — 由 pino-http 自动 redact
        this.logger.log(`${method} ${originalUrl} ${ms}ms params=${JSON.stringify(params)} query=${JSON.stringify(query)}`);
      }),
    );
  }
}
