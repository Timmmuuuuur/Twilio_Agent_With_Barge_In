"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var utils_exports = {};
__export(utils_exports, {
  isLLMMetrics: () => isLLMMetrics,
  isPipelineEOUMetrics: () => isPipelineEOUMetrics,
  isPipelineLLMMetrics: () => isPipelineLLMMetrics,
  isPipelineTTSMetrics: () => isPipelineTTSMetrics,
  isSTTMetrics: () => isSTTMetrics,
  isTTSMetrics: () => isTTSMetrics,
  isVADMetrics: () => isVADMetrics,
  logMetrics: () => logMetrics
});
module.exports = __toCommonJS(utils_exports);
var import_log = require("../log.cjs");
const logMetrics = (metrics) => {
  const logger = (0, import_log.log)();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isLLMMetrics,
  isPipelineEOUMetrics,
  isPipelineLLMMetrics,
  isPipelineTTSMetrics,
  isSTTMetrics,
  isTTSMetrics,
  isVADMetrics,
  logMetrics
});
//# sourceMappingURL=utils.cjs.map