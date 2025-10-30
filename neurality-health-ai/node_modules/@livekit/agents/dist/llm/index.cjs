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
var llm_exports = {};
__export(llm_exports, {
  ChatContext: () => import_chat_context.ChatContext,
  ChatMessage: () => import_chat_context.ChatMessage,
  ChatRole: () => import_chat_context.ChatRole,
  LLM: () => import_llm.LLM,
  LLMEvent: () => import_llm.LLMEvent,
  LLMStream: () => import_llm.LLMStream,
  oaiBuildFunctionInfo: () => import_function_context.oaiBuildFunctionInfo,
  oaiParams: () => import_function_context.oaiParams
});
module.exports = __toCommonJS(llm_exports);
var import_function_context = require("./function_context.cjs");
var import_chat_context = require("./chat_context.cjs");
var import_llm = require("./llm.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatContext,
  ChatMessage,
  ChatRole,
  LLM,
  LLMEvent,
  LLMStream,
  oaiBuildFunctionInfo,
  oaiParams
});
//# sourceMappingURL=index.cjs.map