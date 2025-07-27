import type { ModelInfo } from "../model.js"

export type MyCustomAIModelId = keyof typeof myCustomAIModels

export const myCustomAIDefaultModelId: MyCustomAIModelId = "d8d-ai-model"

export const myCustomAIModels = {
  "d8d-ai-model": {
    maxTokens: 16_384,
    contextWindow: 256_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 6,
    outputPrice: 35,
  },
} as const satisfies Record<string, ModelInfo>

export const MYCUSTOMAI_DEFAULT_TEMPERATURE = 0.6