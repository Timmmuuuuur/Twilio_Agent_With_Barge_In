import { randomUUID } from "crypto";
import { AsyncIterableQueue, Future } from "../utils.js";
class SpeechHandle {
  #id;
  #allowInterruptions;
  #addToChatCtx;
  #isReply;
  #userQuestion;
  #userCommitted = false;
  #initFut = new Future();
  #doneFut = new Future();
  #speechCommitted = false;
  #source;
  #synthesisHandle;
  #initialized = false;
  #fncNestedDepth;
  #fncExtraToolsMesages;
  #nestedSpeechHandles = [];
  #nestedSpeechChanged = new AsyncIterableQueue();
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
    return new SpeechHandle(randomUUID(), allowInterruptions, addToChatCtx, true, userQuestion);
  }
  static createAssistantSpeech(allowInterruptions, addToChatCtx) {
    return new SpeechHandle(randomUUID(), allowInterruptions, addToChatCtx, false, "");
  }
  static createToolSpeech(allowInterruptions, addToChatCtx, fncNestedDepth, extraToolsMessages) {
    return new SpeechHandle(
      randomUUID(),
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
export {
  SpeechHandle
};
//# sourceMappingURL=speech_handle.js.map