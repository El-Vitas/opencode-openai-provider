import { isRecord } from "../../../utils/is-record.js"

function sanitizeStringForLog(value: string): string {
  if (value.startsWith("Bearer ")) {
    return "Bearer [REDACTED]"
  }

  if (value.startsWith("data:")) {
    const separatorIndex = value.indexOf(",")
    const metadata = separatorIndex === -1 ? value : value.slice(0, separatorIndex)
    const payloadLength = separatorIndex === -1 ? 0 : value.length - separatorIndex - 1
    return `${metadata},[omitted:${payloadLength} chars]`
  }

  if (value.length > 1200) {
    return `${value.slice(0, 1200)}...[truncated:${value.length - 1200} chars]`
  }

  return value
}

export function sanitizeForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeStringForLog(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLog(entry))
  }

  if (!isRecord(value)) {
    return value
  }

  const sanitizedEntries = Object.entries(value).map(([key, nestedValue]) => {
    if (key.toLowerCase() === "authorization") {
      return [key, "[REDACTED]"] as const
    }

    return [key, sanitizeForLog(nestedValue)] as const
  })

  return Object.fromEntries(sanitizedEntries)
}
