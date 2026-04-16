import type { FastifyInstance } from "fastify"
import { mapChatCompletionRequest } from "../../../openai/request-mapper.js"
import type { OpenAIChatCompletionRequest, OpenAIModelMapping } from "../../../openai/types.js"
import { validateApiKeyIfRequired } from "../application/auth.js"
import { buildPromptParts } from "../domain/prompt-builder.js"
import { safeDeleteSession, getSessionIDFromCreateResponse } from "../infrastructure/session-manager.js"
import { runStreamingPrompt } from "./streaming-route.js"
import { runNonStreamingPrompt } from "./non-streaming-route.js"
import { sanitizeForLog } from "../infrastructure/log-sanitizer.js"
import type { OpenCodeClient, SessionPromptInput } from "../types.js"

export const registerChatCompletionRoute = (parameters: {
  app: FastifyInstance
  client: OpenCodeClient
  requiredApiKey?: string
  defaultAgent?: string
  modelMapping: OpenAIModelMapping
  promptTimeoutMs: number
  now: () => number
  providerKeys?: Record<string, string>
}) => {
  const { app, client, requiredApiKey, defaultAgent, modelMapping, promptTimeoutMs, now, providerKeys } = parameters

  app.post<{ Body: OpenAIChatCompletionRequest }>("/v1/chat/completions", async (request, reply) => {
    app.log.info(
      {
        requestID: request.id,
        model: request.body?.model,
        stream: request.body?.stream === true,
      },
      "Chat completion request received",
    )

    app.log.info(
      {
        requestID: request.id,
        headers: sanitizeForLog(request.headers),
        body: sanitizeForLog(request.body),
      },
      "Raw OpenAI request payload",
    )

    validateApiKeyIfRequired(requiredApiKey, request.headers.authorization, request.id, app.log)

    const mappedRequest = mapChatCompletionRequest(request.body, modelMapping)
    app.log.info(
      {
        requestID: request.id,
        mappedRequest: sanitizeForLog(mappedRequest),
      },
      "Chat completion request mapped",
    )

    if (providerKeys && mappedRequest.model.providerID) {
      const providerKey = providerKeys[mappedRequest.model.providerID]
      if (providerKey) {
        app.log.info(
          { requestID: request.id, providerID: mappedRequest.model.providerID },
          "Setting provider API key",
        )
        await client.auth.set({
          providerID: mappedRequest.model.providerID,
          auth: { type: "api", key: providerKey },
        })
      }
    }

    app.log.info({ requestID: request.id }, "Creating OpenCode session")
    const createResult = await client.session.create()

    if (createResult.error !== undefined) {
      app.log.error({ requestID: request.id, error: createResult.error }, "OpenCode session create failed")
    }

    const sessionID = getSessionIDFromCreateResponse(createResult)
    app.log.info({ requestID: request.id, sessionID }, "OpenCode session created")

    const promptInput: SessionPromptInput = {
      sessionID,
      model: mappedRequest.model,
      agent: defaultAgent,
      format: mappedRequest.outputFormat,
      parts: buildPromptParts(mappedRequest.messages, mappedRequest.outputFormat),
    }

    app.log.info(
      {
        requestID: request.id,
        sessionID,
        promptInput: sanitizeForLog(promptInput),
      },
      "OpenCode prompt input",
    )

    app.log.info(
      {
        requestID: request.id,
        sessionID,
        agent: defaultAgent ?? null,
        outputFormat: mappedRequest.outputFormat ?? null,
      },
      "Using OpenCode agent for prompt",
    )

    try {
      if (mappedRequest.stream) {
        return await runStreamingPrompt({
          client,
          promptTimeoutMs,
          request,
          reply,
          sessionID,
          promptInput,
          app,
          now,
        })
      }

      return await runNonStreamingPrompt({
        client,
        promptTimeoutMs,
        request,
        reply,
        sessionID,
        promptInput,
        outputFormat: mappedRequest.outputFormat,
        app,
        now,
      })
    } finally {
      app.log.info({ requestID: request.id, sessionID }, "Starting session cleanup")
      await safeDeleteSession(client, sessionID, app)
    }
  })
}
