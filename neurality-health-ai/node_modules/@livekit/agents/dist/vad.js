import { EventEmitter } from "node:events";
import { AsyncIterableQueue } from "./utils.js";
var VADEventType = /* @__PURE__ */ ((VADEventType2) => {
  VADEventType2[VADEventType2["START_OF_SPEECH"] = 0] = "START_OF_SPEECH";
  VADEventType2[VADEventType2["INFERENCE_DONE"] = 1] = "INFERENCE_DONE";
  VADEventType2[VADEventType2["END_OF_SPEECH"] = 2] = "END_OF_SPEECH";
  VADEventType2[VADEventType2["METRICS_COLLECTED"] = 3] = "METRICS_COLLECTED";
  return VADEventType2;
})(VADEventType || {});
class VAD extends EventEmitter {
  #capabilities;
  constructor(capabilities) {
    super();
    this.#capabilities = capabilities;
  }
  get capabilities() {
    return this.#capabilities;
  }
}
class VADStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new AsyncIterableQueue();
  queue = new AsyncIterableQueue();
  output = new AsyncIterableQueue();
  closed = false;
  #vad;
  #lastActivityTime = BigInt(0);
  constructor(vad) {
    this.#vad = vad;
    this.monitorMetrics();
  }
  async monitorMetrics() {
    let inferenceDurationTotal = 0;
    let inferenceCount = 0;
    for await (const event of this.queue) {
      this.output.put(event);
      switch (event.type) {
        case 0 /* START_OF_SPEECH */:
          inferenceCount++;
          if (inferenceCount >= 1 / this.#vad.capabilities.updateInterval) {
            this.#vad.emit(3 /* METRICS_COLLECTED */, {
              timestamp: Date.now(),
              idleTime: Math.trunc(
                Number((process.hrtime.bigint() - this.#lastActivityTime) / BigInt(1e6))
              ),
              inferenceDurationTotal,
              inferenceCount,
              label: this.#vad.label
            });
            inferenceCount = 0;
            inferenceDurationTotal = 0;
          }
          break;
        case 1 /* INFERENCE_DONE */:
        case 2 /* END_OF_SPEECH */:
          this.#lastActivityTime = process.hrtime.bigint();
          break;
      }
    }
    this.output.close();
  }
  pushFrame(frame) {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(frame);
  }
  flush() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(VADStream.FLUSH_SENTINEL);
  }
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
export {
  VAD,
  VADEventType,
  VADStream
};
//# sourceMappingURL=vad.js.map