import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true });

export function validate(schema, data) {
  const validate = ajv.compile(schema);
  const ok = validate(data);
  return { ok, errors: validate.errors };
}
