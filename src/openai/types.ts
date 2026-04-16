export type OpenCodeModel = {
  providerID: string
  modelID: string
}

export type OpenAIModelMapping = Record<string, OpenCodeModel>

export interface OpenAIProviderConfig {
  apiKey?: string
  defaultAgent?: string
  modelMapping?: OpenAIModelMapping
  providerKeys?: Record<string, string>
}

export type OpenAIRole = "system" | "developer" | "user" | "assistant" | "tool"

export type OpenAITextPart = {
  type: "text"
  text?: string
}

export type OpenAIImageUrlPart = {
  type: "image_url"
  image_url?: {
    url?: string
  }
}

export type OpenAIUnknownContentPart = {
  type: string
  [key: string]: unknown
}

export type OpenAIMessage = {
  role: OpenAIRole
  content: string | Array<OpenAITextPart | OpenAIImageUrlPart | OpenAIUnknownContentPart>
}

export type OpenAIResponseFormatJsonObject = {
  type: "json_object"
}

export type OpenAIResponseFormatJsonSchema = {
  type: "json_schema"
  json_schema?: {
    name?: string
    schema?: Record<string, unknown>
    strict?: boolean
  }
}

export type OpenAIResponseFormat = OpenAIResponseFormatJsonObject | OpenAIResponseFormatJsonSchema | Record<string, unknown>

export type OpenAIChatCompletionRequest = {
  model: string
  store?: boolean
  metadata?: Record<string, string>
  temperature?: number
  top_p?: number
  n?: number
  stop?: string | string[]
  max_tokens?: number
  max_completion_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
  logit_bias?: Record<string, number>
  user?: string
  tools?: unknown[]
  tool_choice?: unknown
  parallel_tool_calls?: boolean
  functions?: unknown[]
  function_call?: unknown
  seed?: number
  service_tier?: string
  reasoning_effort?: string
  modalities?: string[]
  audio?: unknown
  prediction?: unknown
  stream_options?: unknown
  stream?: boolean
  response_format?: OpenAIResponseFormat
  messages: OpenAIMessage[]
}

export type OpenAIChatCompletionChoice = {
  index: number
  message: {
    role: "assistant"
    content: string
    refusal?: string | null
    tool_calls?: unknown[] | null
    function_call?: unknown | null
  }
  finish_reason: "stop" | "length" | "content_filter" | "tool_calls" | null
  logprobs?: unknown | null
}

export type OpenAIChatCompletionResponse = {
  id: string
  object: "chat.completion"
  created: number
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_tokens_details?: {
      cached_tokens?: number
      audio_tokens?: number
    }
    completion_tokens_details?: {
      reasoning_tokens?: number
      audio_tokens?: number
      accepted_prediction_tokens?: number
      rejected_prediction_tokens?: number
    }
  }
  choices: OpenAIChatCompletionChoice[]
}

export type OpenAIChatCompletionChunk = {
  id: string
  object: "chat.completion.chunk"
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: "assistant"
      content?: string
      tool_calls?: unknown[]
      refusal?: string | null
    }
    finish_reason: "stop" | null
    logprobs?: unknown | null
  }>
}

export type OpenAIStreamErrorFrame = {
  error: {
    message: string
    type: "invalid_request_error" | "api_error"
    param: string | null
    code: string | null
  }
}

export type OpenAIStreamSseEvent = OpenAIChatCompletionChunk | OpenAIStreamErrorFrame
