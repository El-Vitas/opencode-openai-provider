import type { FilePartInput, OutputFormat, TextPartInput } from "@opencode-ai/sdk/v2"
import type { OpenAIProviderConfig, OpenCodeModel } from "../../openai/types.js"

export type SessionPromptInput = {
  sessionID: string
  model: OpenCodeModel
  agent?: string
  format?: OutputFormat
  parts: Array<TextPartInput | FilePartInput>
}

export type OpenCodeClient = {
  session: {
    create: () => Promise<{ data?: unknown; error?: unknown }>
    prompt: (parameters: SessionPromptInput) => Promise<{ data?: unknown }>
    delete: (parameters: { sessionID: string }) => Promise<{ data?: unknown }>
  }
  auth: {
    set: (parameters: { providerID: string; auth: { type: "api"; key: string } }) => Promise<{ data?: unknown; error?: unknown }>
    remove: (parameters: { providerID: string }) => Promise<{ data?: unknown; error?: unknown }>
  }
}

export type OpenCodeManagedServer = {
  close: () => void
}

export type BuildAppOptions = {
  client?: OpenCodeClient
  opencodeBaseUrl?: string
  promptTimeoutMs?: number
  openai?: OpenAIProviderConfig
  now?: () => number
}

export type ParsedPromptResponse = {
  messageID: string
  promptTokens: number
  completionTokens: number
  parts: Array<{
    type: string
    text: string
  }>
}

export type OpenCodeSdkClientLike = {
  session: {
    create: () => Promise<{ data?: unknown; error?: unknown }>
    prompt: (parameters: SessionPromptInput) => Promise<{ data?: unknown }>
    delete: (parameters: { sessionID: string }) => Promise<{ data?: unknown }>
  }
  auth: {
    set: (parameters: { providerID: string; auth: { type: "api"; key: string } }) => Promise<{ data?: unknown; error?: unknown }>
    remove: (parameters: { providerID: string }) => Promise<{ data?: unknown; error?: unknown }>
  }
}
