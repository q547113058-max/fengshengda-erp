import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body } = req;
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const summary = method === 'GET' ? '' : ` body=${JSON.stringify(body).slice(0, 80)}`;
        this.logger.log(`${method} ${originalUrl} ${ms}ms${summary}`);
      }),
    );
  }
}
