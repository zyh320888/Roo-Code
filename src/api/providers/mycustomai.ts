
import { myCustomAIDefaultModelId, myCustomAIModels, type MyCustomAIModelId } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../shared/api"

import { BaseOpenAiCompatibleProvider } from "./base-openai-compatible-provider"


export class MyCustomAIHandler extends BaseOpenAiCompatibleProvider<MyCustomAIModelId> {
  constructor(options: ApiHandlerOptions) {
    super({
      ...options,
      providerName: "MyCustomAI",
      baseURL: options.myCustomAIBaseUrl || "https://23956.d.d8d.fun/api/v1/ai",
      defaultProviderModelId: myCustomAIDefaultModelId,
      providerModels: myCustomAIModels,
      apiKey: options.myCustomAIApiKey || "sk-23956d8d8d8d8d8d8d8d8d8d8d8d8d8d",
    })
  }
}