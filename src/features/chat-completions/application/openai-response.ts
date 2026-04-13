import type { FastifyReply } from "fastify"
import type { OutputFormat } from "@opencode-ai/sdk/v2"
import type { OpenAIChatCompletionChunk, OpenAIChatCompletionResponse, OpenAIStreamSseEvent } from "../../../openai/types.js"
import type { ParsedPromptResponse } from "../types.js"

export function createChatCompletionId(messageId: string): string {
  return `chatcmpl-${messageId}`
}

export function buildChunk(
  id: string,
  created: number,
  model: string,
  delta: { role?: "assistant"; content?: string },
  finishReason: "stop" | null,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  }
}

export function writeSse(reply: FastifyReply, payload: OpenAIStreamSseEvent): void {
  reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export function writeDone(reply: FastifyReply): void {
  reply.raw.write("data: [DONE]\n\n")
}

export function createOpenAIResponse(
  promptResponse: ParsedPromptResponse,
  requestModel: string,
  _outputFormat: OutputFormat | undefined,
  now: () => number,
): OpenAIChatCompletionResponse {
  const rawResponseContent = promptResponse.parts.map((part) => part.text).join("")
  const responseContent = rawResponseContent

  return {
    id: createChatCompletionId(promptResponse.messageID),
    object: "chat.completion",
    created: Math.floor(now() / 1000),
    model: requestModel,
    usage: {
      prompt_tokens: promptResponse.promptTokens,
      completion_tokens: promptResponse.completionTokens,
      total_tokens: promptResponse.promptTokens + promptResponse.completionTokens,
    },
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: responseContent,
        },
        finish_reason: "stop",
      },
    ],
  }
}
