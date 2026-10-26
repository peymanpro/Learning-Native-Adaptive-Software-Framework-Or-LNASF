import { Controller, Get } from "@nestjs/common";
import { TypingAdaptationService } from "./lnasf/typing-adaptation";

@Controller()
export class LnasfMetricsController {
  constructor(private readonly typingAdaptation: TypingAdaptationService) {}

  @Get("lnasf/metrics")
  getMetrics() {
    return this.typingAdaptation.getSnapshot();
  }
}
