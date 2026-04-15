import { createOpenAIError } from "../errors.js"
import type { OpenAIImageUrlPart, OpenAIResponseFormat, OpenAIResponseFormatJsonSchema, OpenAIRole } from "../types.js"

const createInvalidRequest = (message: string, code: string, param: string): Error => {
  return createOpenAIError(400, "invalid_request_error", message, code, param)
}

export const normalizeRole = (role: OpenAIRole): OpenAIRole => {
  switch (role) {
    case "developer":
    case "system":
    case "user":
    case "assistant":
    case "tool":
      return role
    default:
      throw createInvalidRequest("messages[].role is invalid", "invalid_role", "messages")
  }
}

export const assertDataUrl = (url: string): void => {
  if (!url.startsWith("data:")) {
    throw createInvalidRequest(
      "Only data URL images are supported for image_url content parts",
      "image_url_unsupported",
      "messages",
    )
  }
}

export const isImageUrlPart = (contentPart: { type: string }): contentPart is OpenAIImageUrlPart => {
  return contentPart.type === "image_url"
}

export const isJsonSchemaFormat = (responseFormat: OpenAIResponseFormat): responseFormat is OpenAIResponseFormatJsonSchema => {
  return responseFormat.type === "json_schema"
}

export const createMapperInvalidRequest = (message: string, code: string, param: string): Error => {
  return createInvalidRequest(message, code, param)
}
