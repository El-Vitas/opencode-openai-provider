import { createOpenAIError } from "../../../openai/errors.js"
import { isRecord } from "../../../utils/is-record.js"
import type { ParsedPromptResponse } from "../types.js"

type OpenCodeRawPart = Record<string, unknown>

const formatPrimitive = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value)
  }

  if (isRecord(value) || Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return undefined
}

const extractStateText = (stateValue: unknown): string | undefined => {
  if (!isRecord(stateValue)) {
    return undefined
  }

  const outputValue = stateValue.output
  const outputText = formatPrimitive(outputValue)
  if (outputText !== undefined) {
    return outputText
  }

  const metadata = stateValue.metadata
  if (!isRecord(metadata)) {
    return undefined
  }

  const metadataText = metadata.text
  return typeof metadataText === "string" ? metadataText : undefined
}

const extractPartText = (rawPart: OpenCodeRawPart): string | undefined => {
  const directText = rawPart.text
  if (typeof directText === "string") {
    return directText
  }

  const directContent = rawPart.content
  if (typeof directContent === "string") {
    return directContent
  }

  const outputText = rawPart.output_text
  if (typeof outputText === "string") {
    return outputText
  }

  const jsonValue = rawPart.json
  const jsonText = formatPrimitive(jsonValue)
  if (jsonText !== undefined) {
    return jsonText
  }

  return extractStateText(rawPart.state)
}

export const parsePromptResponse = (data: unknown): ParsedPromptResponse => {
  if (!isRecord(data)) {
    throw createOpenAIError(500, "api_error", "Internal server error", "session_prompt_failed")
  }

  const infoValue = data.info
  if (!isRecord(infoValue)) {
    throw createOpenAIError(500, "api_error", "Internal server error", "session_prompt_failed")
  }

  const messageID = infoValue.id
  if (typeof messageID !== "string" || messageID.length === 0) {
    throw createOpenAIError(500, "api_error", "Internal server error", "session_prompt_failed")
  }

  let promptTokens = 0
  let completionTokens = 0
  const tokensValue = infoValue.tokens
  if (isRecord(tokensValue)) {
    const inputTokens = tokensValue.input
    const outputTokens = tokensValue.output

    promptTokens = typeof inputTokens === "number" ? inputTokens : 0
    completionTokens = typeof outputTokens === "number" ? outputTokens : 0
  }

  const parsedParts: ParsedPromptResponse["parts"] = []
  const partsValue = data.parts
  if (Array.isArray(partsValue)) {
    for (const rawPart of partsValue) {
      if (!isRecord(rawPart)) {
        continue
      }

      const partType = typeof rawPart.type === "string" ? rawPart.type : "unknown"
      const partText = extractPartText(rawPart)
      if (partText !== undefined) {
        parsedParts.push({
          type: partType,
          text: partText,
        })
      }
    }
  }

  if (parsedParts.length === 0) {
    const structuredOutputText = formatPrimitive(infoValue.structured)
    if (structuredOutputText !== undefined) {
      parsedParts.push({
        type: "structured",
        text: structuredOutputText,
      })
    }
  }

  return {
    messageID,
    promptTokens,
    completionTokens,
    parts: parsedParts,
  }
}
