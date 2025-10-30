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
var chat_context_exports = {};
__export(chat_context_exports, {
  ChatContext: () => ChatContext,
  ChatMessage: () => ChatMessage,
  ChatRole: () => ChatRole
});
module.exports = __toCommonJS(chat_context_exports);
var ChatRole = /* @__PURE__ */ ((ChatRole2) => {
  ChatRole2[ChatRole2["SYSTEM"] = 0] = "SYSTEM";
  ChatRole2[ChatRole2["USER"] = 1] = "USER";
  ChatRole2[ChatRole2["ASSISTANT"] = 2] = "ASSISTANT";
  ChatRole2[ChatRole2["TOOL"] = 3] = "TOOL";
  return ChatRole2;
})(ChatRole || {});
const defaultCreateChatMessage = {
  text: "",
  images: [],
  role: 0 /* SYSTEM */
};
class ChatMessage {
  role;
  id;
  name;
  content;
  toolCalls;
  toolCallId;
  toolException;
  /** @internal */
  constructor({
    role,
    id,
    name,
    content,
    toolCalls,
    toolCallId,
    toolException
  }) {
    this.role = role;
    this.id = id;
    this.name = name;
    this.content = content;
    this.toolCalls = toolCalls;
    this.toolCallId = toolCallId;
    this.toolException = toolException;
  }
  static createToolFromFunctionResult(func) {
    if (!func.result && !func.error) {
      throw new TypeError("CallableFunctionResult must include result or error");
    }
    return new ChatMessage({
      role: 3 /* TOOL */,
      name: func.name,
      content: func.result || `Error: ${func.error}`,
      toolCallId: func.toolCallId,
      toolException: func.error
    });
  }
  static createToolCalls(toolCalls, text = "") {
    return new ChatMessage({
      role: 2 /* ASSISTANT */,
      toolCalls,
      content: text
    });
  }
  static create(options) {
    const { text, images, role } = { ...defaultCreateChatMessage, ...options };
    if (!images.length) {
      return new ChatMessage({
        role,
        content: text
      });
    } else {
      return new ChatMessage({
        role,
        content: [...text ? [text] : [], ...images]
      });
    }
  }
  /** Returns a structured clone of this message. */
  copy() {
    return new ChatMessage({
      role: this.role,
      id: this.id,
      name: this.name,
      content: this.content,
      toolCalls: this.toolCalls,
      toolCallId: this.toolCallId,
      toolException: this.toolException
    });
  }
}
class ChatContext {
  messages = [];
  metadata = {};
  append(msg) {
    this.messages.push(ChatMessage.create(msg));
    return this;
  }
  /** Returns a structured clone of this context. */
  copy() {
    const ctx = new ChatContext();
    ctx.messages.push(...this.messages.map((msg) => msg.copy()));
    ctx.metadata = structuredClone(this.metadata);
    return ctx;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatContext,
  ChatMessage,
  ChatRole
});
//# sourceMappingURL=chat_context.cjs.map