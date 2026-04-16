import { buildApp } from "./app.js"
import type { OpenAIModelMapping } from "./openai/types.js"
import { isRecord } from "./utils/is-record.js"

const DEFAULT_PORT = 3000
const MIN_PORT = 1
const MAX_PORT = 65_535
const DEFAULT_PROMPT_TIMEOUT_MS = 30_000

const parsePort = (rawPort: string | undefined): number => {
  if (rawPort === undefined || rawPort.trim().length === 0) {
    return DEFAULT_PORT
  }

  const parsedPort = Number.parseInt(rawPort, 10)
  if (!Number.isInteger(parsedPort) || parsedPort < MIN_PORT || parsedPort > MAX_PORT) {
    throw new Error(`Invalid PORT value: ${rawPort}`)
  }

  return parsedPort
}

const DEFAULT_TARGET_MODEL = "github-copilot/gpt-4o"

const parseModelString = (modelString: string): { providerID: string; modelID: string } => {
  const slashIndex = modelString.indexOf("/")
  if (slashIndex === -1) {
    throw new Error(`Invalid model: ${modelString}. Expected "provider/model"`)
  }

  return {
    providerID: modelString.slice(0, slashIndex),
    modelID: modelString.slice(slashIndex + 1),
  }
}

const createDefaultMapping = (defaultModelString: string): OpenAIModelMapping => {
  const { providerID, modelID } = parseModelString(defaultModelString)
  return { [defaultModelString]: { providerID, modelID } }
}

const extractProviderKeys = (): Record<string, string> => {
  const keys: Record<string, string> = {}
  const pattern = /^(.+)_API_KEY$/i

  for (const [key, value] of Object.entries(process.env)) {
    if (value && value.trim().length > 0) {
      const match = key.match(pattern)
      if (match) {
        const providerID = match[1].toLowerCase()
        keys[providerID] = value.trim()
      }
    }
  }

  return keys
}

const startServer = async (): Promise<void> => {
  const providerApiKey = process.env.API_KEY
  const promptTimeoutMsRaw = process.env.PROMPT_TIMEOUT_MS
  const promptTimeoutMs = promptTimeoutMsRaw ? Number.parseInt(promptTimeoutMsRaw, 10) : undefined

  if (promptTimeoutMsRaw && (!Number.isInteger(promptTimeoutMs) || (promptTimeoutMs ?? 0) <= 0)) {
    throw new Error(`Invalid PROMPT_TIMEOUT_MS value: ${promptTimeoutMsRaw}`)
  }

  const app = await buildApp({
    promptTimeoutMs,
    opencodeBaseUrl: process.env.OPENCODE_BASE_URL,
    openai: {
      apiKey: providerApiKey,
      defaultAgent: process.env.OPENCODE_DEFAULT_AGENT,
      modelMapping: createDefaultMapping(process.env.DEFAULT_MODEL ?? DEFAULT_TARGET_MODEL),
      providerKeys: extractProviderKeys(),
    },
  })

  const providerKeys = extractProviderKeys()

  app.get("/health", async () => {
    return { status: "ok" }
  })

  app.get("/providers", async () => {
    return { providers: Object.keys(providerKeys) }
  })

  app.log.info(
      {
        opencodeMode: "embedded",
        promptTimeoutMs: promptTimeoutMs ?? DEFAULT_PROMPT_TIMEOUT_MS,
        defaultAgent: process.env.OPENCODE_DEFAULT_AGENT ?? null,
      },
      "Provider runtime configuration",
  )

  const host = process.env.HOST ?? "0.0.0.0"
  const port = parsePort(process.env.PORT)

  const address = await app.listen({
    host,
    port,
  })

  console.log(`OpenAI-compatible provider listening on ${address}`)
}

startServer().catch((error) => {
  console.error("Failed to start OpenAI-compatible provider", error)
  process.exitCode = 1
})
