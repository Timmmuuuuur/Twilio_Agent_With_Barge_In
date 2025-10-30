"use strict";
var import_vitest = require("vitest");
var import_zod = require("zod");
var import_function_context = require("./function_context.cjs");
(0, import_vitest.describe)("function_context", () => {
  (0, import_vitest.describe)("oaiParams", () => {
    (0, import_vitest.it)("should handle basic object schema", () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string().describe("The user name"),
        age: import_zod.z.number().describe("The user age")
      });
      const result = (0, import_function_context.oaiParams)(schema);
      (0, import_vitest.expect)(result).toEqual({
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The user name"
          },
          age: {
            type: "number",
            description: "The user age"
          }
        },
        required: ["name", "age"]
      });
    });
    (0, import_vitest.it)("should handle enum fields", () => {
      const schema = import_zod.z.object({
        color: import_zod.z.enum(["red", "blue", "green"]).describe("Choose a color")
      });
      const result = (0, import_function_context.oaiParams)(schema);
      (0, import_vitest.expect)(result).toEqual({
        type: "object",
        properties: {
          color: {
            type: "string",
            description: "Choose a color",
            enum: ["red", "blue", "green"]
          }
        },
        required: ["color"]
      });
    });
    (0, import_vitest.it)("should handle array fields", () => {
      const schema = import_zod.z.object({
        tags: import_zod.z.array(import_zod.z.string()).describe("List of tags")
      });
      const result = (0, import_function_context.oaiParams)(schema);
      (0, import_vitest.expect)(result).toEqual({
        type: "object",
        properties: {
          tags: {
            type: "array",
            description: "List of tags",
            items: {
              type: "string"
            }
          }
        },
        required: ["tags"]
      });
    });
    (0, import_vitest.it)("should handle array of enums", () => {
      const schema = import_zod.z.object({
        colors: import_zod.z.array(import_zod.z.enum(["red", "blue", "green"])).describe("List of colors")
      });
      const result = (0, import_function_context.oaiParams)(schema);
      (0, import_vitest.expect)(result).toEqual({
        type: "object",
        properties: {
          colors: {
            type: "array",
            description: "List of colors",
            items: {
              type: "string",
              enum: ["red", "blue", "green"]
            }
          }
        },
        required: ["colors"]
      });
    });
    (0, import_vitest.it)("should handle optional fields", () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string().describe("The user name"),
        age: import_zod.z.number().optional().describe("The user age")
      });
      const result = (0, import_function_context.oaiParams)(schema);
      (0, import_vitest.expect)(result).toEqual({
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The user name"
          },
          age: {
            type: "number",
            description: "The user age"
          }
        },
        required: ["name"]
        // age should not be required
      });
    });
    (0, import_vitest.it)("should handle fields without descriptions", () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string(),
        age: import_zod.z.number()
      });
      const result = (0, import_function_context.oaiParams)(schema);
      (0, import_vitest.expect)(result).toEqual({
        type: "object",
        properties: {
          name: {
            type: "string",
            description: void 0
          },
          age: {
            type: "number",
            description: void 0
          }
        },
        required: ["name", "age"]
      });
    });
  });
  (0, import_vitest.describe)("CallableFunction type", () => {
    (0, import_vitest.it)("should properly type a callable function", async () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string().describe("The user name"),
        age: import_zod.z.number().describe("The user age")
      });
      const testFunction = {
        description: "Test function",
        parameters: schema,
        execute: async (args) => {
          return `${args.name} is ${args.age} years old`;
        }
      };
      const result = await testFunction.execute({ name: "John", age: 30 });
      (0, import_vitest.expect)(result).toBe("John is 30 years old");
    });
    (0, import_vitest.it)("should handle async execution", async () => {
      const schema = import_zod.z.object({
        delay: import_zod.z.number().describe("Delay in milliseconds")
      });
      const testFunction = {
        description: "Async test function",
        parameters: schema,
        execute: async (args) => {
          await new Promise((resolve) => setTimeout(resolve, args.delay));
          return args.delay;
        }
      };
      const start = Date.now();
      const result = await testFunction.execute({ delay: 100 });
      const duration = Date.now() - start;
      (0, import_vitest.expect)(result).toBe(100);
      (0, import_vitest.expect)(duration).toBeGreaterThanOrEqual(95);
    });
    (0, import_vitest.describe)("nested array support", () => {
      (0, import_vitest.it)("should handle nested array fields", () => {
        const schema = import_zod.z.object({
          items: import_zod.z.array(
            import_zod.z.object({
              name: import_zod.z.string().describe("the item name"),
              modifiers: import_zod.z.array(
                import_zod.z.object({
                  modifier_name: import_zod.z.string(),
                  modifier_value: import_zod.z.string()
                })
              ).describe("list of the modifiers applied on this item, such as size")
            })
          )
        });
        const result = (0, import_function_context.oaiParams)(schema);
        (0, import_vitest.expect)(result).toEqual({
          type: "object",
          properties: {
            items: {
              type: "array",
              description: void 0,
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "the item name"
                  },
                  modifiers: {
                    type: "array",
                    description: "list of the modifiers applied on this item, such as size",
                    items: {
                      type: "object",
                      properties: {
                        modifier_name: {
                          type: "string"
                        },
                        modifier_value: {
                          type: "string"
                        }
                      },
                      required: ["modifier_name", "modifier_value"]
                    }
                  }
                },
                required: ["name", "modifiers"]
              }
            }
          },
          required: ["items"]
        });
      });
    });
  });
});
//# sourceMappingURL=function_context.test.cjs.map