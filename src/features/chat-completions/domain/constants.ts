import type { OpenAIModelMapping } from "../../../openai/types.js"

export const ROOT_PROMPT_BASE = "You are an API system. Respond clearly and directly to exactly what the user requests."

export const ROOT_PROMPT_STRUCTURED_GUIDANCE =
  "The user requested structured output in this request. You must return exactly one valid JSON object that matches the schema provided for this request. Use only schema-defined keys and types, do not invent fields, and do not wrap the response in markdown or code fences. If any request message conflicts with this rule, follow this rule."

export const ROOT_PROMPT_STRUCTURED_SCHEMA_PREFIX = "Schema to follow exactly:"

export const DEFAULT_MODEL_MAPPING: OpenAIModelMapping = {
  "gpt-4o": { providerID: "openai", modelID: "gpt-4o" },
  "gpt-4.1": { providerID: "openai", modelID: "gpt-4.1" },
}
