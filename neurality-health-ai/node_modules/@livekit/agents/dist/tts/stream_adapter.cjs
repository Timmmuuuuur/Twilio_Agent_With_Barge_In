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
var stream_adapter_exports = {};
__export(stream_adapter_exports, {
  StreamAdapter: () => StreamAdapter,
  StreamAdapterWrapper: () => StreamAdapterWrapper
});
module.exports = __toCommonJS(stream_adapter_exports);
var import_tts = require("./tts.cjs");
class StreamAdapter extends import_tts.TTS {
  #tts;
  #sentenceTokenizer;
  label;
  constructor(tts, sentenceTokenizer) {
    super(tts.sampleRate, tts.numChannels, { streaming: true });
    this.#tts = tts;
    this.#sentenceTokenizer = sentenceTokenizer;
    this.label = this.#tts.label;
    this.label = `tts.StreamAdapter<${this.#tts.label}>`;
    this.#tts.on(import_tts.TTSEvent.METRICS_COLLECTED, (metrics) => {
      this.emit(import_tts.TTSEvent.METRICS_COLLECTED, metrics);
    });
  }
  synthesize(text) {
    return this.#tts.synthesize(text);
  }
  stream() {
    return new StreamAdapterWrapper(this.#tts, this.#sentenceTokenizer);
  }
}
class StreamAdapterWrapper extends import_tts.SynthesizeStream {
  #tts;
  #sentenceStream;
  label;
  constructor(tts, sentenceTokenizer) {
    super(tts);
    this.#tts = tts;
    this.#sentenceStream = sentenceTokenizer.stream();
    this.label = `tts.StreamAdapterWrapper<${this.#tts.label}>`;
    this.#run();
  }
  async monitorMetrics() {
    return;
  }
  async #run() {
    const forwardInput = async () => {
      for await (const input of this.input) {
        if (input === import_tts.SynthesizeStream.FLUSH_SENTINEL) {
          this.#sentenceStream.flush();
        } else {
          this.#sentenceStream.pushText(input);
        }
      }
      this.#sentenceStream.endInput();
      this.#sentenceStream.close();
    };
    const synthesize = async () => {
      for await (const ev of this.#sentenceStream) {
        for await (const audio of this.#tts.synthesize(ev.token)) {
          this.output.put(audio);
        }
      }
      this.output.put(import_tts.SynthesizeStream.END_OF_STREAM);
    };
    Promise.all([forwardInput(), synthesize()]);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StreamAdapter,
  StreamAdapterWrapper
});
//# sourceMappingURL=stream_adapter.cjs.map