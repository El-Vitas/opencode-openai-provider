import Fastify from "fastify"
import { applyGlobalHttpHandlers } from "./features/chat-completions/transport/http-handlers.js"
import { registerChatCompletionRoute } from "./features/chat-completions/transport/route.js"
import { createClient } from "./features/chat-completions/infrastructure/opencode-client.js"
import { DEFAULT_MODEL_MAPPING } from "./features/chat-completions/domain/constants.js"
import type { BuildAppOptions } from "./features/chat-completions/types.js"

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true })
  let client = options.client

  if (!client) {
    const createdClient = await createClient(options.opencodeBaseUrl)
    client = createdClient.client

    if (createdClient.managedServer) {
      app.addHook("onClose", async () => {
        createdClient.managedServer?.close()
      })
    }
  }

  const requiredApiKey = options.openai?.apiKey
  const defaultAgent = options.openai?.defaultAgent
  const modelMapping = options.openai?.modelMapping ?? DEFAULT_MODEL_MAPPING
  const promptTimeoutMs = options.promptTimeoutMs ?? 30_000
  const now = options.now ?? (() => Date.now())

  applyGlobalHttpHandlers(app)

  registerChatCompletionRoute({
    app,
    client,
    requiredApiKey,
    defaultAgent,
    modelMapping,
    promptTimeoutMs,
    now,
  })

  return app
}
