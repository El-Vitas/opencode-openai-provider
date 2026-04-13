import "node:process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { generateText, Output } from "ai"
import { z } from "zod"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadRequiredEnv(variableName) {
  const value = process.env[variableName]
  if (!value) {
    throw new Error(`Missing required environment variable: ${variableName}`)
  }

  return value
}

const openAIBaseUrl = loadRequiredEnv("OPENAI_BASE_URL")
const providerApiKey = loadRequiredEnv("OPENAI_API_KEY")
const openAIModel = loadRequiredEnv("OPENAI_MODEL")

const imagePath = path.resolve(__dirname, "../pydantic-ai/test-image.jpg")
const imageBuffer = await readFile(imagePath)

const provider = createOpenAICompatible({
  name: "opencode",
  apiKey: providerApiKey,
  baseURL: openAIBaseUrl,
  supportsStructuredOutputs: true,
  includeUsage: true,
})

const imageAnalysisSchema = z.object({
  short_description: z.string(),
  likely_context: z.string(),
  contains_people: z.boolean(),
})

const result = await generateText({
  model: provider.chatModel(openAIModel),
  output: Output.object({
    name: "ImageAnalysis",
    description: "Return short_description, likely_context, and contains_people.",
    schema: imageAnalysisSchema,
  }),
  system: "Return the schema ",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze this image and return JSON using the schema fields.",
        },
        {
          type: "image",
          mediaType: "image/jpeg",
          image: imageBuffer,
        },
      ],
    },
  ],
})

console.log(JSON.stringify(result.output, null, 2))
