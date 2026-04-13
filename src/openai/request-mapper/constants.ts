import type { JsonSchema } from "./types.js"

export const JSON_OBJECT_FALLBACK_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: true,
}

export const STRUCTURED_OUTPUT_RETRY_COUNT = 3
