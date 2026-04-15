import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify"
import { createOpenAIResponse } from "../application/openai-response.js"
import { parsePromptResponse } from "../domain/response-parser.js"
import { withPromptTimeout } from "../infrastructure/session-manager.js"
import { sanitizeForLog } from "../infrastructure/log-sanitizer.js"
import type { OpenCodeClient, SessionPromptInput } from "../types.js"

type NonStreamingRequest = FastifyRequest<{ Body: { model: string } }>

type NonStreamingReply = FastifyReply

type AppLike = {
  log: FastifyBaseLogger
}

export const runNonStreamingPrompt = async (parameters: {
  client: OpenCodeClient
  promptTimeoutMs: number
  request: NonStreamingRequest
  reply: NonStreamingReply
  sessionID: string
  promptInput: SessionPromptInput
  outputFormat: SessionPromptInput["format"]
  app: AppLike
  now: () => number
}) => {
  const { client, promptTimeoutMs, request, reply, sessionID, promptInput, outputFormat, app, now } = parameters

  app.log.info({ requestID: request.id, sessionID }, "Running non-stream prompt")
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
    "Non-stream prompt completed",
  )

  const response = createOpenAIResponse(parsedPrompt, request.body.model, outputFormat, now)
  app.log.info({ requestID: request.id, sessionID }, "Returning chat completion response")
  return reply.code(200).send(response)
}
