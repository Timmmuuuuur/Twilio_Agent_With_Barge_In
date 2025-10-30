import { z } from "zod";
const looksLikeInstanceof = (value, target) => {
  let current = value == null ? void 0 : value.constructor;
  do {
    if ((current == null ? void 0 : current.name) === target.name) return true;
    current = Object.getPrototypeOf(current);
  } while (current == null ? void 0 : current.name);
  return false;
};
const oaiParams = (p) => {
  const properties = {};
  const requiredProperties = [];
  const processZodType = (field) => {
    const isOptional = field instanceof z.ZodOptional;
    const nestedField = isOptional ? field._def.innerType : field;
    const description = field._def.description;
    if (looksLikeInstanceof(nestedField, z.ZodEnum)) {
      return {
        type: typeof nestedField._def.values[0],
        ...description && { description },
        enum: nestedField._def.values
      };
    } else if (looksLikeInstanceof(nestedField, z.ZodArray)) {
      const elementType = nestedField._def.type;
      return {
        type: "array",
        ...description && { description },
        items: processZodType(elementType)
      };
    } else if (looksLikeInstanceof(nestedField, z.ZodObject)) {
      const { properties: properties2, required } = oaiParams(nestedField);
      return {
        type: "object",
        ...description && { description },
        properties: properties2,
        required
      };
    } else {
      let type2 = nestedField._def.typeName.toLowerCase();
      type2 = type2.includes("zod") ? type2.substring(3) : type2;
      return {
        type: type2,
        ...description && { description }
      };
    }
  };
  for (const key in p.shape) {
    const field = p.shape[key];
    properties[key] = processZodType(field);
    if (!(field instanceof z.ZodOptional)) {
      requiredProperties.push(key);
    }
  }
  const type = "object";
  return {
    type,
    properties,
    required: requiredProperties
  };
};
const oaiBuildFunctionInfo = (fncCtx, toolCallId, fncName, rawArgs) => {
  const func = fncCtx[fncName];
  if (!func) {
    throw new Error(`AI function ${fncName} not found`);
  }
  return {
    name: fncName,
    func,
    toolCallId,
    rawParams: rawArgs,
    params: JSON.parse(rawArgs)
  };
};
export {
  oaiBuildFunctionInfo,
  oaiParams
};
//# sourceMappingURL=function_context.js.map