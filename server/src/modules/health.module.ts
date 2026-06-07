// 健康检查 + 服务依赖状态
import { Module, Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Public } from '../common/public.decorator';

@ApiTags('健康')
@Controller()
@SkipThrottle()   // 健康检查不限流
class HealthController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  @Public()
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

  // 内部健康端点 — 仅 boss 可看（带内存/启动时间详细）
  @Get('internal/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss')
  async internal() {
    return this.health();
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
