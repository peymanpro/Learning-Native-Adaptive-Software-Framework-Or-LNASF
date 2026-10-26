import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { LnasfMetricsController } from './lnasf-metrics.controller';
import { TypingAdaptationService } from './lnasf/typing-adaptation';

@Module({
  controllers: [LnasfMetricsController],
  providers: [ChatGateway, TypingAdaptationService],
})
export class AppModule {}