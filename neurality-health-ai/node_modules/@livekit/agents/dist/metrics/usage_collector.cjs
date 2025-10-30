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
var usage_collector_exports = {};
__export(usage_collector_exports, {
  UsageCollector: () => UsageCollector
});
module.exports = __toCommonJS(usage_collector_exports);
var import_utils = require("./utils.cjs");
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
    if ((0, import_utils.isLLMMetrics)(metrics)) {
      this.#summary.llmPromptTokens += metrics.promptTokens;
      this.#summary.llmCompletionTokens += metrics.completionTokens;
    } else if ((0, import_utils.isTTSMetrics)(metrics)) {
      this.#summary.ttsCharactersCount += metrics.charactersCount;
    } else if ((0, import_utils.isSTTMetrics)(metrics)) {
      this.#summary.sttAudioDuration += metrics.audioDuration;
    }
  }
  get summary() {
    return { ...this.#summary };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  UsageCollector
});
//# sourceMappingURL=usage_collector.cjs.map