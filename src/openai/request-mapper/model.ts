import type { OpenAIModelMapping } from "../types.js"
import { createMapperInvalidRequest } from "./guards.js"

export function resolveModel(model: string, modelMapping: OpenAIModelMapping): { providerID: string; modelID: string } {
  const mappedModel = modelMapping[model]
  if (!mappedModel) {
    throw createMapperInvalidRequest(`Unsupported model: ${model}`, "invalid_model", "model")
  }

  return mappedModel
}
