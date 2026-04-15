import { createOpenAIError } from "../../../openai/errors.js"
import { isRecord } from "../../../utils/is-record.js"
import type { OpenCodeClient } from "../types.js"

export const getSessionIDFromCreateResponse = (createResponse: { data?: unknown; error?: unknown }): string => {
  if (createResponse.error !== undefined) {
    const rawError = createResponse.error
    const errorMessage = rawError instanceof Error ? rawError.message : "OpenCode session create failed"
    throw createOpenAIError(500, "api_error", `Internal server error: ${errorMessage}`, "session_create_failed")
  }

  const data = createResponse.data
  if (!isRecord(data)) {
    throw createOpenAIError(500, "api_error", "Internal server error", "session_create_failed")
  }

  const sessionID = data.id
  if (typeof sessionID !== "string" || sessionID.length === 0) {
    throw createOpenAIError(500, "api_error", "Internal server error", "session_create_failed")
  }

  return sessionID
}

export const safeDeleteSession = async (
  client: OpenCodeClient,
  sessionID: string,
  app: { log: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void } },
) => {
  try {
    app.log.info({ sessionID }, "Deleting OpenCode session")
    await client.session.delete({ sessionID })
    app.log.info({ sessionID }, "Deleted OpenCode session")
  } catch (cleanupError) {
    app.log.error({ sessionID, cleanupError }, "Failed to delete OpenCode session")
  }
}

export const withPromptTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createOpenAIError(500, "api_error", "Internal server error: prompt timeout", "session_prompt_timeout"))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
