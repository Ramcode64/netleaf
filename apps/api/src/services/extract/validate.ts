import { createRequire } from "module";
import { isSafeRegexPattern } from "../../security/validators.js";

const require = createRequire(import.meta.url);

// AJV and ajv-formats are CJS packages; load via require for reliable NodeNext interop
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AjvCtor = require("ajv") as { new (opts: object): { compile: (schema: object) => ((data: unknown) => boolean) & { errors?: Array<{ instancePath?: string; message?: string }> } } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const addFormats = require("ajv-formats") as (ajv: unknown) => void;

const ajv = new AjvCtor({ allErrors: true, strict: false });
addFormats(ajv);

// Guards against adversarial user-supplied JSON Schemas (ReDoS via `pattern`,
// memory blow-up via deep nesting, schema-ref bombs).
const MAX_SCHEMA_BYTES = 50_000;
const MAX_SCHEMA_DEPTH = 20;

function assertSafeSchema(schema: unknown): string | null {
  let serialized: string;
  try {
    serialized = JSON.stringify(schema);
  } catch {
    return "Schema is not serializable";
  }
  if (!serialized) return "Schema is empty";
  if (serialized.length > MAX_SCHEMA_BYTES) {
    return `Schema too large (max ${MAX_SCHEMA_BYTES} bytes)`;
  }
  // Disallow $ref / $data — they enable remote/recursive resolution and bombs.
  if (/"\$ref"|"\$data"/.test(serialized)) {
    return "Schema must not use $ref or $data";
  }

  const depthOf = (node: unknown, depth: number): number => {
    if (depth > MAX_SCHEMA_DEPTH) return depth;
    if (node === null || typeof node !== "object") return depth;
    let max = depth;
    for (const v of Object.values(node as Record<string, unknown>)) {
      max = Math.max(max, depthOf(v, depth + 1));
      if (max > MAX_SCHEMA_DEPTH) break;
    }
    return max;
  };
  if (depthOf(schema, 0) > MAX_SCHEMA_DEPTH) {
    return `Schema nesting too deep (max ${MAX_SCHEMA_DEPTH})`;
  }

  // Validate all `pattern` values to prevent ReDoS. AJV compiles the pattern
  // into a RegExp and runs it against LLM output during validateData(); a
  // catastrophic pattern like (a+)+b hangs the event loop at validation time
  // even though schema compilation itself succeeds.
  const unsafePattern = findUnsafePattern(schema);
  if (unsafePattern !== null) {
    return `Schema contains unsafe regex pattern: ${unsafePattern}`;
  }

  return null;
}

function findUnsafePattern(node: unknown): string | null {
  if (node === null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (key === "pattern" && typeof val === "string") {
      if (!isSafeRegexPattern(val)) return val;
    } else {
      const inner = findUnsafePattern(val);
      if (inner !== null) return inner;
    }
  }
  return null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type AjvValidateFn = ((data: unknown) => boolean) & {
  errors?: Array<{ instancePath?: string; message?: string }>;
};

export function validateSchema(schema: unknown): ValidationResult {
  const unsafe = assertSafeSchema(schema);
  if (unsafe) return { valid: false, errors: [unsafe] };
  try {
    ajv.compile(schema as object);
    return { valid: true, errors: [] };
  } catch (err: unknown) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : "Invalid JSON Schema"],
    };
  }
}

export function validateData(
  data: unknown,
  schema: Record<string, unknown>
): ValidationResult {
  let validate: AjvValidateFn;
  try {
    validate = ajv.compile(schema as object);
  } catch (err: unknown) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : "Invalid JSON Schema"],
    };
  }

  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };

  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message}`
  );
  return { valid: false, errors };
}
