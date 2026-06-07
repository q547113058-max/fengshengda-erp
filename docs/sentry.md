# Sentry 接入指南

## 1. 装 SDK（已装）

`@sentry/node` 已在 server/package.json，版本 v8。

## 2. 配 DSN

在 `.env.production` 加：

```bash
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/123456
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% 性能追踪
```

## 3. 启动时初始化（已完成）

`server/src/common/logging.module.ts` 内有 `initSentry()`：
- 读 `SENTRY_DSN` → 没设就跳过（pino warn 提示）
- 设了就异步 init
- 进程级 `unhandledRejection` / `uncaughtException` → Sentry

## 4. 业务端点手动捕获（可选）

```typescript
import * as Sentry from '@sentry/node';

// 业务代码
try {
  await someRiskyOperation();
} catch (e) {
  Sentry.captureException(e, {
    tags: { module: 'finance', action: 'reverse' },
    user: { id: req.user.id, role: req.user.role },
  });
  throw e;
}
```

## 5. NestJS 全局错误过滤器（TODO v0.3）

写一个 `SentryExceptionFilter` 实现 `ExceptionFilter`，所有 controller 抛错时自动上报到 Sentry。

## 6. 性能追踪

`Sentry.startTransaction()` 包关键操作：
- 大数据查询
- 文件上传
- 报表生成

## 7. 验证

- 在 Sentry 项目设好 alerts（每分钟 N 个 error / 致命 error）
- 故意抛错：`Sentry.captureException(new Error('test'))` 后看 Sentry 几秒内出现
