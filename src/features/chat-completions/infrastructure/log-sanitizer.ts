import { isRecord } from "../../../utils/is-record.js"

const BEARER_PREFIX = "Bearer "
const REDACTED_BEARER = "Bearer [REDACTED]"
const DATA_URL_PREFIX = "data:"
const LOG_STRING_MAX_LENGTH = 1200

const sanitizeStringForLog = (value: string): string => {
  if (value.startsWith(BEARER_PREFIX)) {
    return REDACTED_BEARER
  }

  if (value.startsWith(DATA_URL_PREFIX)) {
    const separatorIndex = value.indexOf(",")
    const metadata = separatorIndex === -1 ? value : value.slice(0, separatorIndex)
    const payloadLength = separatorIndex === -1 ? 0 : value.length - separatorIndex - 1
    return `${metadata},[omitted:${payloadLength} chars]`
  }

  if (value.length > LOG_STRING_MAX_LENGTH) {
    return `${value.slice(0, LOG_STRING_MAX_LENGTH)}...[truncated:${value.length - LOG_STRING_MAX_LENGTH} chars]`
  }

  return value
}

export const sanitizeForLog = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeStringForLog(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLog(entry))
  }

  if (!isRecord(value)) {
    return value
  }

  const sanitizedEntries: Array<[string, unknown]> = Object.entries(value).map(([key, nestedValue]) => {
    if (key.toLowerCase() === "authorization") {
      return [key, "[REDACTED]"]
    }

    return [key, sanitizeForLog(nestedValue)]
  })

  return Object.fromEntries(sanitizedEntries)
}
