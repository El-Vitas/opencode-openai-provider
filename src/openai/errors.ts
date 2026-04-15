export type OpenAIErrorType = "invalid_request_error" | "api_error"

export class OpenAIError extends Error {
  readonly status: number
  readonly type: OpenAIErrorType
  readonly code?: string
  readonly param?: string

  constructor(status: number, type: OpenAIErrorType, message: string, code?: string, param?: string) {
    super(message)
    this.name = "OpenAIError"
    this.status = status
    this.type = type
    this.code = code
    this.param = param
  }
}

export const createOpenAIError = (
  status: number,
  type: OpenAIErrorType,
  message: string,
  code?: string,
  param?: string,
): OpenAIError => {
  return new OpenAIError(status, type, message, code, param)
}

export const isOpenAIError = (value: unknown): value is OpenAIError => {
  return value instanceof OpenAIError
}

export const toOpenAIErrorBody = (error: OpenAIError): {
  error: { message: string; type: OpenAIErrorType; param: string | null; code: string | null }
} => {
  return {
    error: {
      message: error.message,
      type: error.type,
      param: error.param ?? null,
      code: error.code ?? null,
    },
  }
}
