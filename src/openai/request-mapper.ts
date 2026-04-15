import type { OpenAIChatCompletionRequest, OpenAIModelMapping } from "./types.js"
import { mapMessage } from "./request-mapper/content.js"
import { resolveModel } from "./request-mapper/model.js"
import { mapOutputFormat } from "./request-mapper/output-format.js"
import { createMapperInvalidRequest } from "./request-mapper/guards.js"
import type { MappedChatCompletionRequest } from "./request-mapper/types.js"
import { isRecord } from "../utils/is-record.js"

export type { MappedChatCompletionRequest } from "./request-mapper/types.js"

const assertOpenAIChatCompletionRequest: (value: unknown) => asserts value is OpenAIChatCompletionRequest = (value) => {
  if (!isRecord(value)) {
    throw createMapperInvalidRequest("Request body must be an object", "invalid_request_body", "body")
  }

  if (typeof value.model !== "string" || value.model.trim().length === 0) {
    throw createMapperInvalidRequest("model must be a string", "invalid_model", "model")
  }

  if (!Array.isArray(value.messages) || value.messages.length === 0) {
    throw createMapperInvalidRequest("messages must be a non-empty array", "invalid_messages", "messages")
  }
}

export const mapChatCompletionRequest = (body: unknown, modelMapping: OpenAIModelMapping): MappedChatCompletionRequest => {
  assertOpenAIChatCompletionRequest(body)

  return {
    model: resolveModel(body.model, modelMapping),
    stream: body.stream === true,
    outputFormat: mapOutputFormat(body.response_format),
    messages: body.messages.map(mapMessage),
  }
}
