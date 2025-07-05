
import { myCustomAIDefaultModelId, myCustomAIModels, type MyCustomAIModelId } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../shared/api"

import { BaseOpenAiCompatibleProvider } from "./base-openai-compatible-provider"
import * as process from "process"

export class MyCustomAIHandler extends BaseOpenAiCompatibleProvider<MyCustomAIModelId> {
  constructor(options: ApiHandlerOptions) {
    super({
      ...options,
      providerName: "MyCustomAI",
      baseURL: options.myCustomAIBaseUrl || process.env.MY_CUSTOM_AI_BASE_URL || "https://23956.d.d8d.fun/api/v1/ai",
      defaultProviderModelId: myCustomAIDefaultModelId,
      providerModels: myCustomAIModels,
      apiKey: options.myCustomAIApiKey || process.env.MY_CUSTOM_AI_API_KEY || "sk-23956d8d8d8d8d8d8d8d8d8d8d8d8d8d",
    })
  }
}