import type { FilePartInput, OutputFormat, TextPartInput } from "@opencode-ai/sdk/v2"
import { createOpenAIError } from "../../../openai/errors.js"
import type { MappedChatCompletionRequest } from "../../../openai/request-mapper.js"
import {
  ROOT_PROMPT_BASE,
  ROOT_PROMPT_STRUCTURED_GUIDANCE,
  ROOT_PROMPT_STRUCTURED_SCHEMA_PREFIX,
} from "./constants.js"

const createTextPart = (text: string): TextPartInput => {
  return {
    type: "text",
    text,
  }
}

const buildRootPrompt = (outputFormat: OutputFormat | undefined): string => {
  const rootPromptSegments = [ROOT_PROMPT_BASE]

  if (outputFormat?.type === "json_schema") {
    rootPromptSegments.push(ROOT_PROMPT_STRUCTURED_GUIDANCE)
    rootPromptSegments.push(`${ROOT_PROMPT_STRUCTURED_SCHEMA_PREFIX} ${JSON.stringify(outputFormat.schema)}`)
  }

  return `<root> ${rootPromptSegments.join(" ")} </root>`
}

export const buildPromptParts = (
  messages: MappedChatCompletionRequest["messages"],
  outputFormat: OutputFormat | undefined,
): Array<TextPartInput | FilePartInput> => {
  const promptParts: Array<TextPartInput | FilePartInput> = []

  for (const message of messages) {
    const normalizedContent = message.content.trim()

    if (normalizedContent.length > 0) {
      promptParts.push(createTextPart(`[${message.role}] ${normalizedContent}`))
    }

    promptParts.push(...message.files)
  }

  if (promptParts.length === 0) {
    throw createOpenAIError(
      400,
      "invalid_request_error",
      "messages must include at least one text or image part",
      "invalid_messages",
      "messages",
    )
  }

  return [createTextPart(buildRootPrompt(outputFormat)), ...promptParts]
}
