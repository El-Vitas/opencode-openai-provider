import { buildApp } from "./app.js"
import type { OpenAIModelMapping } from "./openai/types.js"
import { isRecord } from "./utils/is-record.js"

function parsePort(rawPort: string | undefined): number {
  const defaultPort = 3000
  if (rawPort === undefined || rawPort.trim().length === 0) {
    return defaultPort
  }

  const parsedPort = Number.parseInt(rawPort, 10)
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`)
  }

  return parsedPort
}

function parseModelMapping(rawModelMapping: string | undefined): OpenAIModelMapping | undefined {
  if (!rawModelMapping || rawModelMapping.trim().length === 0) {
    return undefined
  }

  const parsedValue: unknown = JSON.parse(rawModelMapping)
  if (!isRecord(parsedValue)) {
    throw new Error("OPENAI_MODEL_MAPPING must be a JSON object")
  }

  const validatedMapping: OpenAIModelMapping = {}

  for (const [openAIModel, modelValue] of Object.entries(parsedValue)) {
    if (!isRecord(modelValue)) {
      throw new Error(`Invalid model mapping for ${openAIModel}`)
    }

    const providerID = modelValue.providerID
    const modelID = modelValue.modelID

    if (typeof providerID !== "string" || providerID.length === 0) {
      throw new Error(`Invalid providerID for ${openAIModel}`)
    }

    if (typeof modelID !== "string" || modelID.length === 0) {
      throw new Error(`Invalid modelID for ${openAIModel}`)
    }

    validatedMapping[openAIModel] = {
      providerID,
      modelID,
    }
  }

  return validatedMapping
}

async function startServer(): Promise<void> {
  const providerApiKey = process.env.PROVIDER_API_KEY ?? process.env.OPENAI_API_KEY
  const promptTimeoutMsRaw = process.env.PROMPT_TIMEOUT_MS
  const promptTimeoutMs = promptTimeoutMsRaw ? Number.parseInt(promptTimeoutMsRaw, 10) : undefined

  if (promptTimeoutMsRaw && (!Number.isInteger(promptTimeoutMs) || (promptTimeoutMs ?? 0) <= 0)) {
    throw new Error(`Invalid PROMPT_TIMEOUT_MS value: ${promptTimeoutMsRaw}`)
  }

  const app = await buildApp({
    promptTimeoutMs,
    openai: {
      apiKey: providerApiKey,
      defaultAgent: process.env.OPENCODE_DEFAULT_AGENT,
      modelMapping: parseModelMapping(process.env.OPENAI_MODEL_MAPPING),
    },
  })

  app.log.info(
    {
      opencodeMode: "embedded",
      promptTimeoutMs: promptTimeoutMs ?? 30_000,
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
