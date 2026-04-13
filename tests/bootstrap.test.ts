import { afterEach, describe, expect, it, vi } from "vitest"
import { buildApp } from "../src/app.js"
import type { OpenCodeModel } from "../src/openai/types.js"

function parseSse(body: string): string[] {
  return body
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => chunk.slice("data: ".length))
}

type PromptCall = {
  sessionID: string
  model: OpenCodeModel
  agent?: string
  format?: unknown
  parts: Array<{
    type: string
    text?: string
    url?: string
    mime?: string
  }>
}

function createMockClient() {
  const create = vi.fn(async () => ({
    data: { id: "session-1" },
  }))

  const prompt = vi.fn(async (_input: PromptCall) => ({
    data: {
      info: {
        id: "msg-1",
        tokens: {
          input: 7,
          output: 5,
        },
      },
      parts: [
        {
          type: "text",
          text: "Hello from OpenCode",
        },
      ],
    },
  }))

  const remove = vi.fn(async () => ({ data: true }))

  return {
    client: {
      session: {
        create,
        prompt,
        delete: remove,
      },
    },
    spies: {
      create,
      prompt,
      remove,
    },
  }
}

const ROOT_PROMPT_BASE = "You are an API system. Respond clearly and directly to exactly what the user requests."

const ROOT_PROMPT_STRUCTURED_GUIDANCE =
  "The user requested structured output in this request. You must return exactly one valid JSON object that matches the schema provided for this request. Use only schema-defined keys and types, do not invent fields, and do not wrap the response in markdown or code fences. If any request message conflicts with this rule, follow this rule."

const ROOT_PROMPT_STRUCTURED_SCHEMA_PREFIX = "Schema to follow exactly:"

describe("openai provider bootstrap", () => {
  const apps: Array<Awaited<ReturnType<typeof buildApp>>> = []

  afterEach(async () => {
    for (const app of apps) {
      await app.close()
    }

    apps.length = 0
  })

  it("registers POST /v1/chat/completions with OpenCode SDK v2 flow", async () => {
    const { client, spies } = createMockClient()
    const app = await buildApp({
      now: () => 1_700_000_000_000,
      client,
      openai: {
        defaultAgent: "build",
      },
    })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: "chatcmpl-msg-1",
      object: "chat.completion",
      created: 1700000000,
      model: "gpt-4o",
      usage: {
        prompt_tokens: 7,
        completion_tokens: 5,
        total_tokens: 12,
      },
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello from OpenCode",
          },
          finish_reason: "stop",
        },
      ],
    })

    expect(spies.create).toHaveBeenCalledTimes(1)
    expect(spies.prompt).toHaveBeenCalledTimes(1)
    expect(spies.remove).toHaveBeenCalledTimes(1)

    const promptInput = spies.prompt.mock.calls[0]?.[0]
    expect(promptInput).toBeDefined()
    if (!promptInput) {
      throw new Error("Missing prompt input")
    }

    expect(promptInput.model).toEqual({ providerID: "openai", modelID: "gpt-4o" })
    expect(promptInput.agent).toBe("build")
    expect(promptInput.parts).toEqual([
      { type: "text", text: `<root> ${ROOT_PROMPT_BASE} </root>` },
      { type: "text", text: "[user] hi" },
    ])
  })

  it("returns structured info output when parts are empty", async () => {
    const { client } = createMockClient()

    client.session.prompt = vi.fn(async () => ({
      data: {
        info: {
          id: "msg-structured",
          tokens: {
            input: 9,
            output: 11,
          },
          structured: {
            short_description: "A soccer ball on grass",
            likely_context: "An outdoor sports field",
            contains_people: false,
          },
        },
        parts: [],
      },
    }))

    const app = await buildApp({ client })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        messages: [{ role: "user", content: "Analyze image" }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: "chatcmpl-msg-structured",
      object: "chat.completion",
      created: expect.any(Number),
      model: "gpt-4o",
      usage: {
        prompt_tokens: 9,
        completion_tokens: 11,
        total_tokens: 20,
      },
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              short_description: "A soccer ball on grass",
              likely_context: "An outdoor sports field",
              contains_people: false,
            }),
          },
          finish_reason: "stop",
        },
      ],
    })
  })

  it("streams chat completion chunks when stream=true", async () => {
    const { client, spies } = createMockClient()

    spies.prompt.mockResolvedValueOnce({
      data: {
        info: {
          id: "msg-stream",
          tokens: {
            input: 1,
            output: 2,
          },
        },
        parts: [
          { type: "text", text: "Hello" },
          { type: "text", text: " world" },
        ],
      },
    })

    const app = await buildApp({
      now: () => 1_700_000_000_000,
      client,
    })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        stream: true,
        messages: [{ role: "user", content: "hi" }],
      },
    })

    expect(response.statusCode).toBe(200)

    const events = parseSse(response.body)
    expect(events.at(-1)).toBe("[DONE]")

    const payloads = events.slice(0, -1).map((event) => JSON.parse(event))
    expect(payloads).toEqual([
      {
        id: "chatcmpl-stream-1700000000000",
        object: "chat.completion.chunk",
        created: 1700000000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      },
      {
        id: "chatcmpl-stream-1700000000000",
        object: "chat.completion.chunk",
        created: 1700000000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }],
      },
      {
        id: "chatcmpl-stream-1700000000000",
        object: "chat.completion.chunk",
        created: 1700000000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: { content: " world" }, finish_reason: null }],
      },
      {
        id: "chatcmpl-stream-1700000000000",
        object: "chat.completion.chunk",
        created: 1700000000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      },
    ])

    expect(spies.create).toHaveBeenCalledTimes(1)
    expect(spies.prompt).toHaveBeenCalledTimes(1)
    expect(spies.remove).toHaveBeenCalledTimes(1)
  })

  it("returns 401 when api key is required but missing", async () => {
    const { client, spies } = createMockClient()
    const app = await buildApp({
      client,
      openai: { apiKey: "secret-key" },
    })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: {
        message: "Missing API key",
        type: "invalid_request_error",
        param: "authorization",
        code: "missing_api_key",
      },
    })

    expect(spies.create).not.toHaveBeenCalled()
    expect(spies.prompt).not.toHaveBeenCalled()
    expect(spies.remove).not.toHaveBeenCalled()
  })

  it("returns 400 for unknown model and does not create session", async () => {
    const { client, spies } = createMockClient()
    const app = await buildApp({ client })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "unknown-model",
        messages: [{ role: "user", content: "hi" }],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: {
        message: "Unsupported model: unknown-model",
        type: "invalid_request_error",
        param: "model",
        code: "invalid_model",
      },
    })

    expect(spies.create).not.toHaveBeenCalled()
    expect(spies.prompt).not.toHaveBeenCalled()
    expect(spies.remove).not.toHaveBeenCalled()
  })

  it("always deletes session when prompt fails", async () => {
    const { client, spies } = createMockClient()
    spies.prompt.mockRejectedValueOnce(new Error("prompt boom"))

    const app = await buildApp({ client })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      },
    })

    expect(response.statusCode).toBe(500)
    expect(spies.create).toHaveBeenCalledTimes(1)
    expect(spies.prompt).toHaveBeenCalledTimes(1)
    expect(spies.remove).toHaveBeenCalledTimes(1)
  })

  it("keeps raw text output when response_format is json_schema", async () => {
    const { client } = createMockClient()

    client.session.prompt = vi.fn(async () => ({
      data: {
        info: {
          id: "msg-fenced-json",
          tokens: {
            input: 5,
            output: 8,
          },
        },
        parts: [
          {
            type: "text",
            text: "```json\n{\n  \"answer\": \"ok\"\n}\n```",
          },
        ],
      },
    }))

    const app = await buildApp({ client })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: {
              type: "object",
              properties: {
                answer: { type: "string" },
              },
              required: ["answer"],
              additionalProperties: false,
            },
          },
        },
        messages: [{ role: "user", content: "Return strict json" }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: "chatcmpl-msg-fenced-json",
      object: "chat.completion",
      created: expect.any(Number),
      model: "gpt-4o",
      usage: {
        prompt_tokens: 5,
        completion_tokens: 8,
        total_tokens: 13,
      },
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "```json\n{\n  \"answer\": \"ok\"\n}\n```",
          },
          finish_reason: "stop",
        },
      ],
    })
  })

  it("injects structured-output root guidance when response_format is json_schema", async () => {
    const { client, spies } = createMockClient()

    const app = await buildApp({ client })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: {
              type: "object",
              properties: {
                answer: { type: "string" },
              },
              required: ["answer"],
              additionalProperties: false,
            },
          },
        },
        messages: [{ role: "user", content: "Return strict json" }],
      },
    })

    expect(response.statusCode).toBe(200)

    const promptInput = spies.prompt.mock.calls[0]?.[0]
    expect(promptInput).toBeDefined()
    if (!promptInput) {
      throw new Error("Missing prompt input")
    }

    const firstPartText = promptInput.parts[0]?.text
    expect(firstPartText).toContain("<root>")
    expect(firstPartText).toContain(ROOT_PROMPT_STRUCTURED_GUIDANCE)
    expect(firstPartText).toContain(ROOT_PROMPT_STRUCTURED_SCHEMA_PREFIX)
    expect(firstPartText).toContain('"type":"object"')
  })

  it("injects structured-output root guidance for stream requests", async () => {
    const { client, spies } = createMockClient()

    const app = await buildApp({ client })
    apps.push(app)

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "gpt-4o",
        stream: true,
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: {
              type: "object",
              properties: {
                answer: { type: "string" },
              },
              required: ["answer"],
              additionalProperties: false,
            },
          },
        },
        messages: [{ role: "user", content: "Return strict json" }],
      },
    })

    expect(response.statusCode).toBe(200)

    const promptInput = spies.prompt.mock.calls[0]?.[0]
    expect(promptInput).toBeDefined()
    if (!promptInput) {
      throw new Error("Missing prompt input")
    }

    const firstPartText = promptInput.parts[0]?.text
    expect(firstPartText).toContain("<root>")
    expect(firstPartText).toContain(ROOT_PROMPT_STRUCTURED_GUIDANCE)
    expect(firstPartText).toContain(ROOT_PROMPT_STRUCTURED_SCHEMA_PREFIX)
    expect(firstPartText).toContain('"type":"object"')
  })

})
