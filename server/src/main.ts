import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './common/logging.interceptor';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('丰晟达 ERP API')
    .setDescription('鸡爪供应链 ERP 后端接口文档')
    .setVersion('0.1.0')
    .addTag('产品', '产品信息、1%/9% 双税票价')
    .addTag('采购', '采购单 + 级联批次/流水/付款')
    .addTag('销售', '销售单 + 级联批次/佣金/收款')
    .addTag('库存', '批次、出入库、库存聚合')
    .addTag('客户', '客户档案')
    .addTag('供应商', '供应商档案')
    .addTag('财务', '支付账户 + 进出款流水')
    .addTag('佣金', '佣金记录 + 结算')
    .addTag('媒体', '图片视频资料')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, { useGlobalPrefix: false });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 丰晟达 ERP 后端已启动 → http://0.0.0.0:${port}/api`, 'Bootstrap');
  Logger.log(`📚 Swagger 文档 → http://0.0.0.0:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
