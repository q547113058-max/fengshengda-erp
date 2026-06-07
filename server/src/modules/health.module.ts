import { Module, Controller, Get } from '@nestjs/common';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'fengshengda-erp', ts: new Date().toISOString(), db: process.env.DB_TYPE || 'mysql' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
