import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify"
import { createOpenAIError, toOpenAIErrorBody } from "../../../openai/errors.js"
import { sanitizeForLog } from "../infrastructure/log-sanitizer.js"
import { buildChunk, createChatCompletionId, writeDone, writeSse } from "../application/openai-response.js"
import { parsePromptResponse } from "../domain/response-parser.js"
import { withPromptTimeout } from "../infrastructure/session-manager.js"
import type { OpenCodeClient, SessionPromptInput } from "../types.js"

type StreamingRequest = FastifyRequest<{ Body: { model: string } }>

type StreamingReply = FastifyReply

type AppLike = {
  log: FastifyBaseLogger
}

export async function runStreamingPrompt(parameters: {
  client: OpenCodeClient
  promptTimeoutMs: number
  request: StreamingRequest
  reply: StreamingReply
  sessionID: string
  promptInput: SessionPromptInput
  app: AppLike
  now: () => number
}): Promise<StreamingReply> {
  const { client, promptTimeoutMs, request, reply, sessionID, promptInput, app, now } = parameters

  reply.code(200)
  reply.header("Content-Type", "text/event-stream; charset=utf-8")
  reply.header("Cache-Control", "no-cache")
  reply.header("Connection", "keep-alive")

  const streamNow = now()
  const completionID = createChatCompletionId(`stream-${streamNow}`)
  const created = Math.floor(streamNow / 1000)
  let terminalSent = false

  const sendFinishAndDone = () => {
    if (terminalSent) {
      return
    }

    writeSse(reply, buildChunk(completionID, created, request.body.model, {}, "stop"))
    writeDone(reply)
    terminalSent = true
  }

  const sendErrorAndDone = () => {
    if (terminalSent) {
      return
    }

    const wrappedError = createOpenAIError(500, "api_error", "Internal server error", "stream_error")
    writeSse(reply, toOpenAIErrorBody(wrappedError))
    writeDone(reply)
    terminalSent = true
  }

  writeSse(reply, buildChunk(completionID, created, request.body.model, { role: "assistant" }, null))
  app.log.info({ requestID: request.id, sessionID }, "Streaming response started")

  try {
    const promptResult = await withPromptTimeout(client.session.prompt(promptInput), promptTimeoutMs)

    app.log.info(
      {
        requestID: request.id,
        sessionID,
        promptResult: sanitizeForLog(promptResult.data),
      },
      "Raw OpenCode prompt result",
    )

    const parsedPrompt = parsePromptResponse(promptResult.data)
    app.log.info(
      {
        requestID: request.id,
        sessionID,
        outputParts: parsedPrompt.parts.length,
        promptTokens: parsedPrompt.promptTokens,
        completionTokens: parsedPrompt.completionTokens,
      },
      "Streaming prompt completed",
    )

    for (const part of parsedPrompt.parts) {
      if (part.text.length > 0) {
        writeSse(reply, buildChunk(completionID, created, request.body.model, { content: part.text }, null))
      }
    }

    sendFinishAndDone()
  } catch (streamError) {
    app.log.error({ requestID: request.id, sessionID, error: streamError }, "Streaming prompt failed")
    sendErrorAndDone()
  }

  reply.raw.end()
  app.log.info({ requestID: request.id, sessionID }, "Streaming response ended")
  return reply
}
