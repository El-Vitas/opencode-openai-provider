import type { FilePartInput, OutputFormat } from "@opencode-ai/sdk/v2"
import type { OpenAIRole } from "../types.js"

export type JsonSchema = Record<string, unknown>

export type MappedInputMessage = {
  role: OpenAIRole
  content: string
  files: FilePartInput[]
}

export type MappedChatCompletionRequest = {
  model: {
    providerID: string
    modelID: string
  }
  stream: boolean
  outputFormat?: OutputFormat
  messages: MappedInputMessage[]
}
