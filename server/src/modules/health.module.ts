// 健康检查 + 服务依赖状态
import { Module, Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('健康')
@Controller()
class HealthController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  @Get('health')
  async health() {
    const dbOk = this.ds.isInitialized;
    let dbDetail = 'ok';
    if (!dbOk) {
      dbDetail = 'not initialized';
    } else {
      try {
        await this.ds.query('SELECT 1');
      } catch (e: any) {
        dbDetail = `query failed: ${e.message}`;
      }
    }

    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'fengshengda-erp',
      version: '0.1.0',
      ts: new Date().toISOString(),
      db: {
        type: this.ds.options.type,
        status: dbOk ? 'up' : 'down',
        detail: dbDetail,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      sentry: !!process.env.SENTRY_DSN,
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
