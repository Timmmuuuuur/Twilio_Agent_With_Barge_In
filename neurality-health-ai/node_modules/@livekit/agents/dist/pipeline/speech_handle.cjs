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
var speech_handle_exports = {};
__export(speech_handle_exports, {
  SpeechHandle: () => SpeechHandle
});
module.exports = __toCommonJS(speech_handle_exports);
var import_crypto = require("crypto");
var import_utils = require("../utils.cjs");
class SpeechHandle {
  #id;
  #allowInterruptions;
  #addToChatCtx;
  #isReply;
  #userQuestion;
  #userCommitted = false;
  #initFut = new import_utils.Future();
  #doneFut = new import_utils.Future();
  #speechCommitted = false;
  #source;
  #synthesisHandle;
  #initialized = false;
  #fncNestedDepth;
  #fncExtraToolsMesages;
  #nestedSpeechHandles = [];
  #nestedSpeechChanged = new import_utils.AsyncIterableQueue();
  #nestedSpeechFinished = false;
  constructor(id, allowInterruptions, addToChatCtx, isReply, userQuestion, fncNestedDepth = 0, extraToolsMessages = void 0) {
    this.#id = id;
    this.#allowInterruptions = allowInterruptions;
    this.#addToChatCtx = addToChatCtx;
    this.#isReply = isReply;
    this.#userQuestion = userQuestion;
    this.#fncNestedDepth = fncNestedDepth;
    this.#fncExtraToolsMesages = extraToolsMessages;
  }
  static createAssistantReply(allowInterruptions, addToChatCtx, userQuestion) {
    return new SpeechHandle((0, import_crypto.randomUUID)(), allowInterruptions, addToChatCtx, true, userQuestion);
  }
  static createAssistantSpeech(allowInterruptions, addToChatCtx) {
    return new SpeechHandle((0, import_crypto.randomUUID)(), allowInterruptions, addToChatCtx, false, "");
  }
  static createToolSpeech(allowInterruptions, addToChatCtx, fncNestedDepth, extraToolsMessages) {
    return new SpeechHandle(
      (0, import_crypto.randomUUID)(),
      allowInterruptions,
      addToChatCtx,
      false,
      "",
      fncNestedDepth,
      extraToolsMessages
    );
  }
  async waitForInitialization() {
    await this.#initFut.await;
  }
  initialize(source, synthesisHandle) {
    if (this.interrupted) {
      throw new Error("speech was interrupted");
    }
    this.#source = source;
    this.#synthesisHandle = synthesisHandle;
    this.#initialized = true;
    this.#initFut.resolve();
  }
  markUserCommitted() {
    this.#userCommitted = true;
  }
  markSpeechCommitted() {
    this.#speechCommitted = true;
  }
  get userCommitted() {
    return this.#userCommitted;
  }
  get speechCommitted() {
    return this.#speechCommitted;
  }
  get id() {
    return this.#id;
  }
  get allowInterruptions() {
    return this.#allowInterruptions;
  }
  get addToChatCtx() {
    return this.#addToChatCtx;
  }
  get source() {
    if (!this.#source) {
      throw new Error("speech not initialized");
    }
    return this.#source;
  }
  get synthesisHandle() {
    if (!this.#synthesisHandle) {
      throw new Error("speech not initialized");
    }
    return this.#synthesisHandle;
  }
  set synthesisHandle(handle) {
    this.#synthesisHandle = handle;
  }
  get initialized() {
    return this.#initialized;
  }
  get isReply() {
    return this.#isReply;
  }
  get userQuestion() {
    return this.#userQuestion;
  }
  get interrupted() {
    var _a;
    return !!((_a = this.#synthesisHandle) == null ? void 0 : _a.interrupted);
  }
  get fncNestedDepth() {
    return this.#fncNestedDepth;
  }
  get extraToolsMessages() {
    return this.#fncExtraToolsMesages;
  }
  addNestedSpeech(handle) {
    this.#nestedSpeechHandles.push(handle);
    this.#nestedSpeechChanged.put();
  }
  get nestedSpeechHandles() {
    return this.#nestedSpeechHandles;
  }
  async nestedSpeechChanged() {
    await this.#nestedSpeechChanged.next();
  }
  get nestedSpeechFinished() {
    return this.#nestedSpeechFinished;
  }
  markNestedSpeechFinished() {
    this.#nestedSpeechFinished = true;
  }
  join() {
    return this.#doneFut.await;
  }
  setDone() {
    this.#doneFut.resolve();
  }
  interrupt() {
    if (!this.#allowInterruptions) {
      throw new Error("interruptions are not allowed");
    }
    this.cancel();
  }
  cancel() {
    var _a;
    this.#initFut.reject(new Error());
    this.#nestedSpeechChanged.close();
    (_a = this.#synthesisHandle) == null ? void 0 : _a.interrupt();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SpeechHandle
});
//# sourceMappingURL=speech_handle.cjs.map