import { log } from "../log.js";
const logMetrics = (metrics) => {
  const logger = log();
  if (isPipelineLLMMetrics(metrics)) {
    logger.child({
      sequenceId: metrics.sequenceId,
      ttft: metrics.ttft,
      inputTokens: metrics.promptTokens,
      outputTokens: metrics.completionTokens,
      tokensPerSecond: metrics.tokensPerSecond
    }).info("Pipeline LLM metrics");
  } else if (isLLMMetrics(metrics)) {
    logger.child({
      ttft: metrics.ttft,
      inputTokens: metrics.promptTokens,
      outputTokens: metrics.completionTokens,
      tokensPerSecond: metrics.tokensPerSecond
    }).info("LLM metrics");
  } else if (isPipelineTTSMetrics(metrics)) {
    logger.child({
      sequenceId: metrics.sequenceId,
      ttfb: metrics.ttfb,
      audioDuration: metrics.audioDuration
    }).info("Pipeline TTS metrics");
  } else if (isTTSMetrics(metrics)) {
    logger.child({
      ttfb: metrics.ttfb,
      audioDuration: metrics.audioDuration
    }).info("TTS metrics");
  } else if (isPipelineEOUMetrics(metrics)) {
    logger.child({
      sequenceId: metrics.sequenceId,
      endOfUtteranceDelay: metrics.endOfUtteranceDelay,
      transcriptionDelay: metrics.transcriptionDelay
    }).info("Pipeline EOU metrics");
  } else if (isSTTMetrics(metrics)) {
    logger.child({
      audioDuration: metrics.audioDuration
    }).info("STT metrics");
  }
};
const isLLMMetrics = (metrics) => {
  return !!metrics.ttft;
};
const isPipelineLLMMetrics = (metrics) => {
  return isLLMMetrics(metrics) && !!metrics.sequenceId;
};
const isVADMetrics = (metrics) => {
  return !!metrics.inferenceCount;
};
const isPipelineEOUMetrics = (metrics) => {
  return !!metrics.endOfUtteranceDelay;
};
const isTTSMetrics = (metrics) => {
  return !!metrics.ttfb;
};
const isPipelineTTSMetrics = (metrics) => {
  return isTTSMetrics(metrics) && !!metrics.sequenceId;
};
const isSTTMetrics = (metrics) => {
  return !(isLLMMetrics(metrics) || isVADMetrics(metrics) || isPipelineEOUMetrics(metrics) || isTTSMetrics(metrics));
};
export {
  isLLMMetrics,
  isPipelineEOUMetrics,
  isPipelineLLMMetrics,
  isPipelineTTSMetrics,
  isSTTMetrics,
  isTTSMetrics,
  isVADMetrics,
  logMetrics
};
//# sourceMappingURL=utils.js.map