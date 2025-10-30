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
export {
  ChatContext,
  ChatMessage,
  ChatRole
};
//# sourceMappingURL=chat_context.js.map