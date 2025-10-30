class MultimodalLLMError extends Error {
  type;
  reason;
  code;
  constructor({
    type,
    reason,
    code,
    message
  } = {}) {
    super(message);
    this.type = type;
    this.reason = reason;
    this.code = code;
  }
}
export {
  MultimodalLLMError
};
//# sourceMappingURL=base.js.map