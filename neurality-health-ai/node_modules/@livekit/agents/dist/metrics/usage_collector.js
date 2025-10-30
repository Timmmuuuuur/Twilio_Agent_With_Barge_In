import { isLLMMetrics, isSTTMetrics, isTTSMetrics } from "./utils.js";
class UsageCollector {
  #summary;
  constructor() {
    this.#summary = {
      llmPromptTokens: 0,
      llmCompletionTokens: 0,
      ttsCharactersCount: 0,
      sttAudioDuration: 0
    };
  }
  collect(metrics) {
    if (isLLMMetrics(metrics)) {
      this.#summary.llmPromptTokens += metrics.promptTokens;
      this.#summary.llmCompletionTokens += metrics.completionTokens;
    } else if (isTTSMetrics(metrics)) {
      this.#summary.ttsCharactersCount += metrics.charactersCount;
    } else if (isSTTMetrics(metrics)) {
      this.#summary.sttAudioDuration += metrics.audioDuration;
    }
  }
  get summary() {
    return { ...this.#summary };
  }
}
export {
  UsageCollector
};
//# sourceMappingURL=usage_collector.js.map