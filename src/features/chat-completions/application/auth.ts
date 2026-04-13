import { createOpenAIError } from "../../../openai/errors.js"

type AppLogger = {
  info: (obj: unknown, msg: string) => void
}

export function validateApiKeyIfRequired(
  requiredApiKey: string | undefined,
  authorizationHeader: string | string[] | undefined,
  requestID: string,
  logger: AppLogger,
): void {
  if (!requiredApiKey) {
    return
  }

  const normalizedAuthorizationHeader =
    typeof authorizationHeader === "string" ? authorizationHeader : Array.isArray(authorizationHeader) ? authorizationHeader[0] : undefined

  const bearerToken =
    typeof normalizedAuthorizationHeader === "string" && normalizedAuthorizationHeader.startsWith("Bearer ")
      ? normalizedAuthorizationHeader.slice("Bearer ".length).trim()
      : ""

  if (!bearerToken) {
    throw createOpenAIError(401, "invalid_request_error", "Missing API key", "missing_api_key", "authorization")
  }

  if (bearerToken !== requiredApiKey) {
    throw createOpenAIError(401, "invalid_request_error", "Invalid API key", "invalid_api_key", "authorization")
  }

  logger.info({ requestID }, "API key validated")
}
