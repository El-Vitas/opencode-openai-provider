import type { FilePartInput } from "@opencode-ai/sdk/v2"
import type { OpenAIChatCompletionRequest, OpenAIImageUrlPart } from "../types.js"
import { assertDataUrl, createMapperInvalidRequest, isImageUrlPart, normalizeRole } from "./guards.js"
import type { MappedInputMessage } from "./types.js"

function parseDataUrlMime(url: string): string {
  const separatorIndex = url.indexOf(",")
  const metadata = separatorIndex === -1 ? url : url.slice(0, separatorIndex)
  const mimeMatch = /^data:([^;,]+)[;,]/.exec(metadata)
  return mimeMatch?.[1] ?? "application/octet-stream"
}

function mapImagePart(imagePart: OpenAIImageUrlPart): FilePartInput {
  const imageUrl = imagePart.image_url?.url
  if (typeof imageUrl !== "string" || imageUrl.length === 0) {
    throw createMapperInvalidRequest(
      "image_url.url is required for image_url content parts",
      "image_url_missing_url",
      "messages",
    )
  }

  assertDataUrl(imageUrl)

  return {
    type: "file",
    url: imageUrl,
    mime: parseDataUrlMime(imageUrl),
  }
}

export function normalizeTextContent(content: OpenAIChatCompletionRequest["messages"][number]["content"]): {
  content: string
  files: FilePartInput[]
} {
  if (typeof content === "string") {
    return {
      content,
      files: [],
    }
  }

  if (!Array.isArray(content)) {
    throw createMapperInvalidRequest(
      "messages[].content must be a string or an array of content parts",
      "invalid_content_type",
      "messages",
    )
  }

  let combinedText = ""
  const files: FilePartInput[] = []

  for (const contentPart of content) {
    if (typeof contentPart !== "object" || contentPart === null || typeof contentPart.type !== "string") {
      throw createMapperInvalidRequest("Unsupported content part type", "invalid_content_part_type", "messages")
    }

    if (contentPart.type === "text") {
      const textPart = contentPart.text
      if (textPart !== undefined && typeof textPart !== "string") {
        throw createMapperInvalidRequest("Text content parts must provide a string text value", "invalid_text_part", "messages")
      }

      combinedText += textPart ?? ""
      continue
    }

    if (isImageUrlPart(contentPart)) {
      files.push(mapImagePart(contentPart))
      continue
    }

    throw createMapperInvalidRequest(`Unsupported content part type: ${contentPart.type}`, "invalid_content_part_type", "messages")
  }

  return {
    content: combinedText,
    files,
  }
}

export function mapMessage(message: OpenAIChatCompletionRequest["messages"][number]): MappedInputMessage {
  const normalizedContent = normalizeTextContent(message.content)

  return {
    role: normalizeRole(message.role),
    content: normalizedContent.content,
    files: normalizedContent.files,
  }
}
