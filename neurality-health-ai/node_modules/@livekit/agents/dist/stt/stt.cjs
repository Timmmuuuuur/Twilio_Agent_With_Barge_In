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
var stt_exports = {};
__export(stt_exports, {
  STT: () => STT,
  SpeechEventType: () => SpeechEventType,
  SpeechStream: () => SpeechStream
});
module.exports = __toCommonJS(stt_exports);
var import_node_events = require("node:events");
var import_utils = require("../utils.cjs");
var SpeechEventType = /* @__PURE__ */ ((SpeechEventType2) => {
  SpeechEventType2[SpeechEventType2["START_OF_SPEECH"] = 0] = "START_OF_SPEECH";
  SpeechEventType2[SpeechEventType2["INTERIM_TRANSCRIPT"] = 1] = "INTERIM_TRANSCRIPT";
  SpeechEventType2[SpeechEventType2["FINAL_TRANSCRIPT"] = 2] = "FINAL_TRANSCRIPT";
  SpeechEventType2[SpeechEventType2["END_OF_SPEECH"] = 3] = "END_OF_SPEECH";
  SpeechEventType2[SpeechEventType2["RECOGNITION_USAGE"] = 4] = "RECOGNITION_USAGE";
  SpeechEventType2[SpeechEventType2["METRICS_COLLECTED"] = 5] = "METRICS_COLLECTED";
  return SpeechEventType2;
})(SpeechEventType || {});
class STT extends import_node_events.EventEmitter {
  #capabilities;
  constructor(capabilities) {
    super();
    this.#capabilities = capabilities;
  }
  /** Returns this STT's capabilities */
  get capabilities() {
    return this.#capabilities;
  }
  /** Receives an audio buffer and returns transcription in the form of a {@link SpeechEvent} */
  async recognize(frame) {
    const startTime = process.hrtime.bigint();
    const event = await this._recognize(frame);
    const duration = Number((process.hrtime.bigint() - startTime) / BigInt(1e6));
    this.emit(5 /* METRICS_COLLECTED */, {
      requestId: event.requestId ?? "",
      timestamp: Date.now(),
      duration,
      label: this.label,
      audioDuration: Array.isArray(frame) ? frame.reduce((sum, a) => sum + a.samplesPerChannel / a.sampleRate, 0) : frame.samplesPerChannel / frame.sampleRate,
      streamed: false
    });
    return event;
  }
}
class SpeechStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new import_utils.AsyncIterableQueue();
  output = new import_utils.AsyncIterableQueue();
  queue = new import_utils.AsyncIterableQueue();
  closed = false;
  #stt;
  constructor(stt) {
    this.#stt = stt;
    this.monitorMetrics();
  }
  async monitorMetrics() {
    const startTime = process.hrtime.bigint();
    for await (const event of this.queue) {
      this.output.put(event);
      if (event.type !== 4 /* RECOGNITION_USAGE */) continue;
      const duration = process.hrtime.bigint() - startTime;
      const metrics = {
        timestamp: Date.now(),
        requestId: event.requestId,
        duration: Math.trunc(Number(duration / BigInt(1e6))),
        label: this.label,
        audioDuration: event.recognitionUsage.audioDuration,
        streamed: true
      };
      this.#stt.emit(5 /* METRICS_COLLECTED */, metrics);
    }
    this.output.close();
  }
  /** Push an audio frame to the STT */
  pushFrame(frame) {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(frame);
  }
  /** Flush the STT, causing it to process all pending text */
  flush() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(SpeechStream.FLUSH_SENTINEL);
  }
  /** Mark the input as ended and forbid additional pushes */
  endInput() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.close();
  }
  next() {
    return this.output.next();
  }
  /** Close both the input and output of the STT stream */
  close() {
    this.input.close();
    this.queue.close();
    this.output.close();
    this.closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STT,
  SpeechEventType,
  SpeechStream
});
//# sourceMappingURL=stt.cjs.map