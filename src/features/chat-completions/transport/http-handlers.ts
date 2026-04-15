import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { createOpenAIError, isOpenAIError, toOpenAIErrorBody } from "../../../openai/errors.js"

const hasStatusCode = (value: unknown): value is { statusCode: number } => {
  if (typeof value !== "object" || value === null || !("statusCode" in value)) {
    return false
  }

  return typeof value.statusCode === "number"
}

const resolveStatusCode = (error: unknown): number => {
  if (isOpenAIError(error)) {
    return error.status
  }

  if (hasStatusCode(error)) {
    return error.statusCode
  }

  return 500
}

export const applyGlobalHttpHandlers = (app: FastifyInstance): void => {
  app.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (isOpenAIError(error)) {
      return reply.code(error.status).send(toOpenAIErrorBody(error))
    }

    const statusCode = resolveStatusCode(error)

    if (statusCode === 404) {
      const wrappedError = createOpenAIError(404, "invalid_request_error", "Not found", "not_found")
      return reply.code(404).send(toOpenAIErrorBody(wrappedError))
    }

    if (statusCode >= 400 && statusCode < 500) {
      const wrappedError = createOpenAIError(statusCode, "invalid_request_error", "Invalid request")
      return reply.code(statusCode).send(toOpenAIErrorBody(wrappedError))
    }

    const wrappedError = createOpenAIError(500, "api_error", "Internal server error")
    return reply.code(500).send(toOpenAIErrorBody(wrappedError))
  })

  app.setNotFoundHandler((_request, reply) => {
    const wrappedError = createOpenAIError(404, "invalid_request_error", "Not found", "not_found")
    return reply.code(404).send(toOpenAIErrorBody(wrappedError))
  })
}
