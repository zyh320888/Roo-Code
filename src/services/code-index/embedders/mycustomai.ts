import { OpenAICompatibleEmbedder } from "./openai-compatible"
import { IEmbedder, EmbeddingResponse, EmbedderInfo } from "../interfaces/embedder"
import { MAX_ITEM_TOKENS } from "../constants"
import { t } from "../../../i18n"
import { TelemetryEventName } from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

/**
 * MyCustomAI embedder implementation that wraps the OpenAI Compatible embedder
 * with configuration for a custom OpenAI-compatible embedding API.
 *
 * Supported models:
 * - d8d-embedding-text-240715 (dimension: 2560)
 */
export class MyCustomAIEmbedder implements IEmbedder {
	private readonly openAICompatibleEmbedder: OpenAICompatibleEmbedder
	// private static readonly MYCUSTOMAI_BASE_URL = "https://www.d8d.fun/api/v1/ai"
	private static readonly MYCUSTOMAI_BASE_URL = "https://23956.d.d8d.fun/api/v1/ai"
	private static readonly DEFAULT_MODEL = "d8d-embedding-text-240715"
	private readonly modelId: string

	/**
	 * Creates a new MyCustomAI embedder
	 * @param apiKey The MyCustomAI API key for authentication
	 * @param modelId The model ID to use (defaults to text-embedding-3-small)
	 */
	constructor(apiKey: string, modelId?: string) {

		// Use provided model or default
		this.modelId = modelId || MyCustomAIEmbedder.DEFAULT_MODEL

		// Create an OpenAI Compatible embedder with MyCustomAI's configuration
		this.openAICompatibleEmbedder = new OpenAICompatibleEmbedder(
			process.env.MY_CUSTOM_AI_BASE_URL || MyCustomAIEmbedder.MYCUSTOMAI_BASE_URL,
			process.env.MY_CUSTOM_AI_API_KEY || apiKey,
			this.modelId,
			MAX_ITEM_TOKENS,
		)
	}

	/**
	 * Creates embeddings for the given texts using MyCustomAI's embedding API
	 * @param texts Array of text strings to embed
	 * @param model Optional model identifier (uses constructor model if not provided)
	 * @returns Promise resolving to embedding response
	 */
	async createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse> {
		try {
			// Use the provided model or fall back to the instance's model
			const modelToUse = model || this.modelId
			return await this.openAICompatibleEmbedder.createEmbeddings(texts, modelToUse)
		} catch (error) {
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "MyCustomAIEmbedder:createEmbeddings",
			})
			throw error
		}
	}

	/**
	 * Validates the MyCustomAI embedder configuration by delegating to the underlying OpenAI-compatible embedder
	 * @returns Promise resolving to validation result with success status and optional error message
	 */
	async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
		try {
			// Delegate validation to the OpenAI-compatible embedder
			// The error messages will be specific to MyCustomAI since we're using MyCustomAI's base URL
			return await this.openAICompatibleEmbedder.validateConfiguration()
		} catch (error) {
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "MyCustomAIEmbedder:validateConfiguration",
			})
			throw error
		}
	}

	/**
	 * Returns information about this embedder
	 */
	get embedderInfo(): EmbedderInfo {
		return {
			name: "mycustomai",
		}
	}
}