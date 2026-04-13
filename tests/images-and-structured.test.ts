import { describe, expect, it } from "vitest"
import { createOpenAIError, isOpenAIError, toOpenAIErrorBody } from "../src/openai/errors.js"
import { mapChatCompletionRequest } from "../src/openai/request-mapper.js"

const modelMapping = {
  "gpt-4o": { providerID: "openai", modelID: "gpt-4o" },
}

describe("openai request mapper", () => {
  it("maps user multimodal data-url image into sdk file parts", () => {
    const mapped = mapChatCompletionRequest(
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "describe this image" },
              { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
            ],
          },
        ],
      },
      modelMapping,
    )

    expect(mapped.model).toEqual({ providerID: "openai", modelID: "gpt-4o" })
    expect(mapped.messages).toEqual([
      {
        role: "user",
        content: "describe this image",
        files: [{ type: "file", url: "data:image/png;base64,AAAA", mime: "image/png" }],
      },
    ])
  })

  it("rejects non-data image urls with openai-style invalid request error", () => {
    expect(() =>
      mapChatCompletionRequest(
        {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [{ type: "image_url", image_url: { url: "https://example.com/a.png" } }],
            },
          ],
        },
        modelMapping,
      ),
    ).toThrowError("Only data URL images are supported for image_url content parts")

    expect.assertions(5)

    try {
      mapChatCompletionRequest(
        {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [{ type: "image_url", image_url: { url: "http://example.com/a.png" } }],
            },
          ],
        },
        modelMapping,
      )
    } catch (error) {
      expect(isOpenAIError(error)).toBe(true)
      if (isOpenAIError(error)) {
        expect(error.status).toBe(400)
        expect(error.type).toBe("invalid_request_error")
        expect(error.code).toBe("image_url_unsupported")
      }
    }
  })

  it("maps response_format json_object to json_schema output format", () => {
    const mapped = mapChatCompletionRequest(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        response_format: { type: "json_object" },
      },
      modelMapping,
    )

    expect(mapped.outputFormat).toEqual({
      type: "json_schema",
      schema: {
        type: "object",
        additionalProperties: true,
      },
      retryCount: 3,
    })
  })

  it("maps response_format json_schema to json_schema output format", () => {
    const mapped = mapChatCompletionRequest(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: "Return JSON" }],
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
      },
      modelMapping,
    )

    expect(mapped.outputFormat).toEqual({
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
        },
        required: ["answer"],
        additionalProperties: false,
      },
      retryCount: 3,
    })
  })

  it("strips $schema from response_format json_schema payload", () => {
    const mapped = mapChatCompletionRequest(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: "Return JSON" }],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: {
              $schema: "http://json-schema.org/draft-07/schema#",
              type: "object",
              properties: {
                answer: { type: "string" },
              },
              required: ["answer"],
              additionalProperties: false,
            },
          },
        },
      },
      modelMapping,
    )

    expect(mapped.outputFormat).toEqual({
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
        },
        required: ["answer"],
        additionalProperties: false,
      },
      retryCount: 3,
    })
  })

  it("serializes OpenAI errors with null param and code when missing", () => {
    const error = createOpenAIError(400, "invalid_request_error", "Bad request")

    expect(toOpenAIErrorBody(error)).toEqual({
      error: {
        message: "Bad request",
        type: "invalid_request_error",
        param: null,
        code: null,
      },
    })
  })
})
