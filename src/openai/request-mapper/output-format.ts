import type { OutputFormat } from "@opencode-ai/sdk/v2"
import { isRecord } from "../../utils/is-record.js"
import type { OpenAIChatCompletionRequest, OpenAIResponseFormatJsonSchema } from "../types.js"
import { JSON_OBJECT_FALLBACK_SCHEMA, STRUCTURED_OUTPUT_RETRY_COUNT } from "./constants.js"
import { createMapperInvalidRequest, isJsonSchemaFormat } from "./guards.js"
import type { JsonSchema } from "./types.js"

const assertValidJsonSchema: (schema: unknown) => asserts schema is JsonSchema = (schema) => {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw createMapperInvalidRequest(
      "response_format.json_schema.schema must be a JSON Schema object",
      "invalid_json_schema",
      "response_format",
    )
  }

  if (Object.getPrototypeOf(schema) !== Object.prototype) {
    throw createMapperInvalidRequest(
      "response_format.json_schema.schema must be a plain JSON object",
      "invalid_json_schema",
      "response_format",
    )
  }
}

const sanitizeJsonSchemaValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonSchemaValue(entry))
  }

  if (!isRecord(value)) {
    return value
  }

  const sanitizedEntries: Array<[string, unknown]> = Object.entries(value)
    .filter(([key]) => key !== "$schema")
    .map(([key, nestedValue]) => [key, sanitizeJsonSchemaValue(nestedValue)])

  return Object.fromEntries(sanitizedEntries)
}

const sanitizeJsonSchema = (schema: JsonSchema): JsonSchema => {
  const sanitizedSchema = sanitizeJsonSchemaValue(schema)
  if (isRecord(sanitizedSchema)) {
    return sanitizedSchema
  }

  return schema
}

const mapSchemaOutputFormat = (responseFormat: OpenAIResponseFormatJsonSchema): OutputFormat => {
  const schema = responseFormat.json_schema?.schema
  assertValidJsonSchema(schema)

  return {
    type: "json_schema",
    schema: sanitizeJsonSchema(schema),
    retryCount: STRUCTURED_OUTPUT_RETRY_COUNT,
  }
}

export const mapOutputFormat = (responseFormat: OpenAIChatCompletionRequest["response_format"]): OutputFormat | undefined => {
  if (responseFormat === undefined) {
    return undefined
  }

  if (typeof responseFormat !== "object" || responseFormat === null || typeof responseFormat.type !== "string") {
    throw createMapperInvalidRequest("Unsupported response_format.type", "invalid_response_format_type", "response_format")
  }

  if (responseFormat.type === "json_object") {
    return {
      type: "json_schema",
      schema: JSON_OBJECT_FALLBACK_SCHEMA,
      retryCount: STRUCTURED_OUTPUT_RETRY_COUNT,
    }
  }

  if (isJsonSchemaFormat(responseFormat)) {
    return mapSchemaOutputFormat(responseFormat)
  }

  throw createMapperInvalidRequest("Unsupported response_format.type", "invalid_response_format_type", "response_format")
}
