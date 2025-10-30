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
  AsyncIterableQueue: () => AsyncIterableQueue,
  AudioEnergyFilter: () => AudioEnergyFilter,
  CancellablePromise: () => CancellablePromise,
  ExpFilter: () => ExpFilter,
  Future: () => Future,
  Queue: () => Queue,
  findMicroTrackId: () => findMicroTrackId,
  gracefullyCancel: () => gracefullyCancel,
  mergeFrames: () => mergeFrames
});
module.exports = __toCommonJS(utils_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_node_events = require("node:events");
const mergeFrames = (buffer) => {
  if (Array.isArray(buffer)) {
    buffer = buffer;
    if (buffer.length == 0) {
      throw new TypeError("buffer is empty");
    }
    const sampleRate = buffer[0].sampleRate;
    const channels = buffer[0].channels;
    let samplesPerChannel = 0;
    let data = new Int16Array();
    for (const frame of buffer) {
      if (frame.sampleRate !== sampleRate) {
        throw new TypeError("sample rate mismatch");
      }
      if (frame.channels !== channels) {
        throw new TypeError("channel count mismatch");
      }
      data = new Int16Array([...data, ...frame.data]);
      samplesPerChannel += frame.samplesPerChannel;
    }
    return new import_rtc_node.AudioFrame(data, sampleRate, channels, samplesPerChannel);
  }
  return buffer;
};
const findMicroTrackId = (room, identity) => {
  var _a;
  let p = room.remoteParticipants.get(identity);
  if (identity === ((_a = room.localParticipant) == null ? void 0 : _a.identity)) {
    p = room.localParticipant;
  }
  if (!p) {
    throw new Error(`participant ${identity} not found`);
  }
  let trackId;
  p.trackPublications.forEach((track) => {
    if (track.source === import_rtc_node.TrackSource.SOURCE_MICROPHONE) {
      trackId = track.sid;
      return;
    }
  });
  if (!trackId) {
    throw new Error(`participant ${identity} does not have a microphone track`);
  }
  return trackId;
};
class Queue {
  /** @internal */
  items = [];
  #limit;
  #events = new import_node_events.EventEmitter();
  constructor(limit) {
    this.#limit = limit;
  }
  async get() {
    const _get = async () => {
      if (this.items.length === 0) {
        await (0, import_node_events.once)(this.#events, "put");
      }
      let item2 = this.items.shift();
      if (!item2) {
        item2 = await _get();
      }
      return item2;
    };
    const item = _get();
    this.#events.emit("get");
    return item;
  }
  async put(item) {
    if (this.#limit && this.items.length >= this.#limit) {
      await (0, import_node_events.once)(this.#events, "get");
    }
    this.items.push(item);
    this.#events.emit("put");
  }
}
class Future {
  #await;
  #resolvePromise;
  #rejectPromise;
  #done = false;
  constructor() {
    this.#await = new Promise((resolve, reject) => {
      this.#resolvePromise = resolve;
      this.#rejectPromise = reject;
    });
  }
  get await() {
    return this.#await;
  }
  get done() {
    return this.#done;
  }
  resolve() {
    this.#done = true;
    this.#resolvePromise();
  }
  reject(error) {
    this.#done = true;
    this.#rejectPromise(error);
  }
}
class CancellablePromise {
  #promise;
  #cancelFn;
  #isCancelled = false;
  #error = null;
  constructor(executor) {
    let cancel;
    this.#promise = new Promise((resolve, reject) => {
      executor(
        resolve,
        (reason) => {
          this.#error = reason instanceof Error ? reason : new Error(String(reason));
          reject(reason);
        },
        (cancelFn) => {
          cancel = () => {
            this.#isCancelled = true;
            cancelFn();
          };
        }
      );
    });
    this.#cancelFn = cancel;
  }
  get isCancelled() {
    return this.#isCancelled;
  }
  get error() {
    return this.#error;
  }
  then(onfulfilled, onrejected) {
    return this.#promise.then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.#promise.catch(onrejected);
  }
  finally(onfinally) {
    return this.#promise.finally(onfinally);
  }
  cancel() {
    this.#cancelFn();
  }
  static from(promise) {
    return new CancellablePromise((resolve, reject) => {
      promise.then(resolve).catch(reject);
    });
  }
}
async function gracefullyCancel(promise) {
  if (!promise.isCancelled) {
    promise.cancel();
  }
  try {
    await promise;
  } catch (error) {
  }
}
class AsyncIterableQueue {
  static CLOSE_SENTINEL = Symbol("CLOSE_SENTINEL");
  #queue = new Queue();
  #closed = false;
  get closed() {
    return this.#closed;
  }
  put(item) {
    if (this.#closed) {
      throw new Error("Queue is closed");
    }
    this.#queue.put(item);
  }
  close() {
    this.#closed = true;
    this.#queue.put(AsyncIterableQueue.CLOSE_SENTINEL);
  }
  async next() {
    if (this.#closed && this.#queue.items.length === 0) {
      return { value: void 0, done: true };
    }
    const item = await this.#queue.get();
    if (item === AsyncIterableQueue.CLOSE_SENTINEL && this.#closed) {
      return { value: void 0, done: true };
    }
    return { value: item, done: false };
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
class ExpFilter {
  #alpha;
  #max;
  #filtered = void 0;
  constructor(alpha, max) {
    this.#alpha = alpha;
    this.#max = max;
  }
  reset(alpha) {
    if (alpha) {
      this.#alpha = alpha;
    }
    this.#filtered = void 0;
  }
  apply(exp, sample) {
    if (this.#filtered) {
      const a = this.#alpha ** exp;
      this.#filtered = a * this.#filtered + (1 - a) * sample;
    } else {
      this.#filtered = sample;
    }
    if (this.#max && this.#filtered > this.#max) {
      this.#filtered = this.#max;
    }
    return this.#filtered;
  }
  get filtered() {
    return this.#filtered;
  }
  set alpha(alpha) {
    this.#alpha = alpha;
  }
}
class AudioEnergyFilter {
  #cooldownSeconds;
  #cooldown;
  constructor(cooldownSeconds = 1) {
    this.#cooldownSeconds = cooldownSeconds;
    this.#cooldown = cooldownSeconds;
  }
  pushFrame(frame) {
    const arr = Float32Array.from(frame.data, (x) => x / 32768);
    const rms = (arr.map((x) => x ** 2).reduce((acc, x) => acc + x) / arr.length) ** 0.5;
    if (rms > 4e-3) {
      this.#cooldown = this.#cooldownSeconds;
      return true;
    }
    const durationSeconds = frame.samplesPerChannel / frame.sampleRate;
    this.#cooldown -= durationSeconds;
    if (this.#cooldown > 0) {
      return true;
    }
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AsyncIterableQueue,
  AudioEnergyFilter,
  CancellablePromise,
  ExpFilter,
  Future,
  Queue,
  findMicroTrackId,
  gracefullyCancel,
  mergeFrames
});
//# sourceMappingURL=utils.cjs.map