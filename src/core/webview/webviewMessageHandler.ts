import * as path from "path"
import fs from "fs/promises"
import pWaitFor from "p-wait-for"
import * as vscode from "vscode"

import { ClineProvider } from "./ClineProvider"
import { Language, ApiConfigMeta } from "../../schemas"
import { changeLanguage, t } from "../../i18n"
import { ApiConfiguration } from "../../shared/api"
import { supportPrompt } from "../../shared/support-prompt"

import { checkoutDiffPayloadSchema, checkoutRestorePayloadSchema, WebviewMessage } from "../../shared/WebviewMessage"
import { checkExistKey } from "../../shared/checkExistApiConfig"
import { experimentDefault } from "../../shared/experiments"
import { Terminal } from "../../integrations/terminal/Terminal"
import { openFile, openImage } from "../../integrations/misc/open-file"
import { selectImages } from "../../integrations/misc/process-images"
import { getTheme } from "../../integrations/theme/getTheme"
import { discoverChromeHostUrl, tryChromeHostUrl } from "../../services/browser/browserDiscovery"
import { searchWorkspaceFiles } from "../../services/search/file-search"
import { fileExistsAtPath } from "../../utils/fs"
import { playSound, setSoundEnabled, setSoundVolume } from "../../utils/sound"
import { playTts, setTtsEnabled, setTtsSpeed, stopTts } from "../../utils/tts"
import { singleCompletionHandler } from "../../utils/single-completion-handler"
import { searchCommits } from "../../utils/git"
import { exportSettings, importSettings } from "../config/importExport"
import { getOpenAiModels } from "../../api/providers/openai"
import { getOllamaModels } from "../../api/providers/ollama"
import { getVsCodeLmModels } from "../../api/providers/vscode-lm"
import { getLmStudioModels } from "../../api/providers/lmstudio"
import { openMention } from "../mentions"
import { telemetryService } from "../../services/telemetry/TelemetryService"
import { TelemetrySetting } from "../../shared/TelemetrySetting"
import { getWorkspacePath } from "../../utils/path"
import { Mode, defaultModeSlug, getModeBySlug, getGroupName } from "../../shared/modes"
import { SYSTEM_PROMPT } from "../prompts/system"
import { buildApiHandler } from "../../api"
import { GlobalState } from "../../schemas"
import { MultiSearchReplaceDiffStrategy } from "../diff/strategies/multi-search-replace"
import { getModels } from "../../api/providers/fetchers/cache"

export const webviewMessageHandler = async (provider: ClineProvider, message: WebviewMessage) => {
	// Utility functions provided for concise get/update of global state via contextProxy API.
	const getGlobalState = <K extends keyof GlobalState>(key: K) => provider.contextProxy.getValue(key)
	const updateGlobalState = async <K extends keyof GlobalState>(key: K, value: GlobalState[K]) =>
		await provider.contextProxy.setValue(key, value)

	switch (message.type) {
		case "webviewDidLaunch":
			// Load custom modes first
			const customModes = await provider.customModesManager.getCustomModes()
			await updateGlobalState("customModes", customModes)

			provider.postStateToWebview()
			provider.workspaceTracker?.initializeFilePaths() // Don't await.

			getTheme().then((theme) => provider.postMessageToWebview({ type: "theme", text: JSON.stringify(theme) }))

			// If MCP Hub is already initialized, update the webview with
			// current server list.
			const mcpHub = provider.getMcpHub()

			if (mcpHub) {
				provider.postMessageToWebview({ type: "mcpServers", mcpServers: mcpHub.getAllServers() })
			}

			provider.providerSettingsManager
				.listConfig()
				.then(async (listApiConfig) => {
					if (!listApiConfig) {
						return
					}

					if (listApiConfig.length === 1) {
						// Check if first time init then sync with exist config.
						if (!checkExistKey(listApiConfig[0])) {
							const { apiConfiguration } = await provider.getState()

							await provider.providerSettingsManager.saveConfig(
								listApiConfig[0].name ?? "default",
								apiConfiguration,
							)

							listApiConfig[0].apiProvider = apiConfiguration.apiProvider
						}
					}

					const currentConfigName = getGlobalState("currentApiConfigName")

					if (currentConfigName) {
						if (!(await provider.providerSettingsManager.hasConfig(currentConfigName))) {
							// current config name not valid, get first config in list
							await updateGlobalState("currentApiConfigName", listApiConfig?.[0]?.name)
							if (listApiConfig?.[0]?.name) {
								const apiConfig = await provider.providerSettingsManager.loadConfig(
									listApiConfig?.[0]?.name,
								)

								await Promise.all([
									updateGlobalState("listApiConfigMeta", listApiConfig),
									provider.postMessageToWebview({ type: "listApiConfig", listApiConfig }),
									provider.updateApiConfiguration(apiConfig),
								])
								await provider.postStateToWebview()
								return
							}
						}
					}

					await Promise.all([
						await updateGlobalState("listApiConfigMeta", listApiConfig),
						await provider.postMessageToWebview({ type: "listApiConfig", listApiConfig }),
					])
				})
				.catch((error) =>
					provider.log(
						`Error list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					),
				)

			// If user already opted in to telemetry, enable telemetry service
			provider.getStateToPostToWebview().then((state) => {
				const { telemetrySetting } = state
				const isOptedIn = telemetrySetting === "enabled"
				telemetryService.updateTelemetryState(isOptedIn)
			})

			provider.isViewLaunched = true
			break
		case "newTask":
			// Code that should run in response to the hello message command
			//vscode.window.showInformationMessage(message.text!)

			// Send a message to our webview.
			// You can send any JSON serializable data.
			// Could also do this in extension .ts
			//provider.postMessageToWebview({ type: "text", text: `Extension: ${Date.now()}` })
			// initializing new instance of Cline will make sure that any agentically running promises in old instance don't affect our new task. this essentially creates a fresh slate for the new task
			await provider.initClineWithTask(message.text, message.images)
			break
		case "apiConfiguration":
			if (message.apiConfiguration) {
				await provider.updateApiConfiguration(message.apiConfiguration)
			}
			await provider.postStateToWebview()
			break
		case "customInstructions":
			await provider.updateCustomInstructions(message.text)
			break
		case "alwaysAllowReadOnly":
			await updateGlobalState("alwaysAllowReadOnly", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowReadOnlyOutsideWorkspace":
			await updateGlobalState("alwaysAllowReadOnlyOutsideWorkspace", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowWrite":
			await updateGlobalState("alwaysAllowWrite", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowWriteOutsideWorkspace":
			await updateGlobalState("alwaysAllowWriteOutsideWorkspace", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowExecute":
			await updateGlobalState("alwaysAllowExecute", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowBrowser":
			await updateGlobalState("alwaysAllowBrowser", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowMcp":
			await updateGlobalState("alwaysAllowMcp", message.bool)
			await provider.postStateToWebview()
			break
		case "alwaysAllowModeSwitch":
			await updateGlobalState("alwaysAllowModeSwitch", message.bool)
			await provider.postStateToWebview()
			break
		case "alwaysAllowSubtasks":
			await updateGlobalState("alwaysAllowSubtasks", message.bool)
			await provider.postStateToWebview()
			break
		case "askResponse":
			provider.getCurrentCline()?.handleWebviewAskResponse(message.askResponse!, message.text, message.images)
			break
		case "terminalOperation":
			if (message.terminalOperation) {
				provider.getCurrentCline()?.handleTerminalOperation(message.terminalOperation)
			}
			break
		case "clearTask":
			// clear task resets the current session and allows for a new task to be started, if this session is a subtask - it allows the parent task to be resumed
			await provider.finishSubTask(t("common:tasks.canceled"))
			await provider.postStateToWebview()
			break
		case "didShowAnnouncement":
			await updateGlobalState("lastShownAnnouncementId", provider.latestAnnouncementId)
			await provider.postStateToWebview()
			break
		case "selectImages":
			const images = await selectImages()
			await provider.postMessageToWebview({ type: "selectedImages", images })
			break
		case "exportCurrentTask":
			const currentTaskId = provider.getCurrentCline()?.taskId
			if (currentTaskId) {
				provider.exportTaskWithId(currentTaskId)
			}
			break
		case "showTaskWithId":
			provider.showTaskWithId(message.text!)
			break
		case "deleteTaskWithId":
			provider.deleteTaskWithId(message.text!)
			break
		case "deleteMultipleTasksWithIds": {
			const ids = message.ids

			if (Array.isArray(ids)) {
				// Process in batches of 20 (or another reasonable number)
				const batchSize = 20
				const results = []

				// Only log start and end of the operation
				console.log(`Batch deletion started: ${ids.length} tasks total`)

				for (let i = 0; i < ids.length; i += batchSize) {
					const batch = ids.slice(i, i + batchSize)

					const batchPromises = batch.map(async (id) => {
						try {
							await provider.deleteTaskWithId(id)
							return { id, success: true }
						} catch (error) {
							// Keep error logging for debugging purposes
							console.log(
								`Failed to delete task ${id}: ${error instanceof Error ? error.message : String(error)}`,
							)
							return { id, success: false }
						}
					})

					// Process each batch in parallel but wait for completion before starting the next batch
					const batchResults = await Promise.all(batchPromises)
					results.push(...batchResults)

					// Update the UI after each batch to show progress
					await provider.postStateToWebview()
				}

				// Log final results
				const successCount = results.filter((r) => r.success).length
				const failCount = results.length - successCount
				console.log(
					`Batch deletion completed: ${successCount}/${ids.length} tasks successful, ${failCount} tasks failed`,
				)
			}
			break
		}
		case "exportTaskWithId":
			provider.exportTaskWithId(message.text!)
			break
		case "importSettings":
			const { success } = await importSettings({
				providerSettingsManager: provider.providerSettingsManager,
				contextProxy: provider.contextProxy,
				customModesManager: provider.customModesManager,
			})

			if (success) {
				provider.settingsImportedAt = Date.now()
				await provider.postStateToWebview()
				await vscode.window.showInformationMessage(t("common:info.settings_imported"))
			}

			break
		case "exportSettings":
			await exportSettings({
				providerSettingsManager: provider.providerSettingsManager,
				contextProxy: provider.contextProxy,
			})

			break
		case "resetState":
			await provider.resetState()
			break
		case "requestRouterModels":
			const [openRouterModels, requestyModels, glamaModels, unboundModels] = await Promise.all([
				getModels("openrouter"),
				getModels("requesty"),
				getModels("glama"),
				getModels("unbound"),
			])

			provider.postMessageToWebview({
				type: "routerModels",
				routerModels: {
					openrouter: openRouterModels,
					requesty: requestyModels,
					glama: glamaModels,
					unbound: unboundModels,
				},
			})
			break
		case "requestOpenAiModels":
			if (message?.values?.baseUrl && message?.values?.apiKey) {
				const openAiModels = await getOpenAiModels(
					message?.values?.baseUrl,
					message?.values?.apiKey,
					message?.values?.hostHeader,
				)

				provider.postMessageToWebview({ type: "openAiModels", openAiModels })
			}

			break
		case "requestOllamaModels":
			const ollamaModels = await getOllamaModels(message.text)
			// TODO: Cache like we do for OpenRouter, etc?
			provider.postMessageToWebview({ type: "ollamaModels", ollamaModels })
			break
		case "requestLmStudioModels":
			const lmStudioModels = await getLmStudioModels(message.text)
			// TODO: Cache like we do for OpenRouter, etc?
			provider.postMessageToWebview({ type: "lmStudioModels", lmStudioModels })
			break
		case "requestVsCodeLmModels":
			const vsCodeLmModels = await getVsCodeLmModels()
			// TODO: Cache like we do for OpenRouter, etc?
			provider.postMessageToWebview({ type: "vsCodeLmModels", vsCodeLmModels })
			break
		case "openImage":
			openImage(message.text!)
			break
		case "openFile":
			openFile(message.text!, message.values as { create?: boolean; content?: string })
			break
		case "openMention":
			openMention(message.text)
			break
		case "checkpointDiff":
			const result = checkoutDiffPayloadSchema.safeParse(message.payload)

			if (result.success) {
				await provider.getCurrentCline()?.checkpointDiff(result.data)
			}

			break
		case "checkpointRestore": {
			const result = checkoutRestorePayloadSchema.safeParse(message.payload)

			if (result.success) {
				await provider.cancelTask()

				try {
					await pWaitFor(() => provider.getCurrentCline()?.isInitialized === true, { timeout: 3_000 })
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_timeout"))
				}

				try {
					await provider.getCurrentCline()?.checkpointRestore(result.data)
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_failed"))
				}
			}

			break
		}
		case "cancelTask":
			await provider.cancelTask()
			break
		case "allowedCommands":
			await provider.context.globalState.update("allowedCommands", message.commands)
			// Also update workspace settings
			await vscode.workspace
				.getConfiguration("roo-cline")
				.update("allowedCommands", message.commands, vscode.ConfigurationTarget.Global)
			break
		case "openMcpSettings": {
			const mcpSettingsFilePath = await provider.getMcpHub()?.getMcpSettingsFilePath()
			if (mcpSettingsFilePath) {
				openFile(mcpSettingsFilePath)
			}
			break
		}
		case "openProjectMcpSettings": {
			if (!vscode.workspace.workspaceFolders?.length) {
				vscode.window.showErrorMessage(t("common:errors.no_workspace"))
				return
			}

			const workspaceFolder = vscode.workspace.workspaceFolders[0]
			const rooDir = path.join(workspaceFolder.uri.fsPath, ".roo")
			const mcpPath = path.join(rooDir, "mcp.json")

			try {
				await fs.mkdir(rooDir, { recursive: true })
				const exists = await fileExistsAtPath(mcpPath)
				if (!exists) {
					await fs.writeFile(mcpPath, JSON.stringify({ mcpServers: {} }, null, 2))
				}
				await openFile(mcpPath)
			} catch (error) {
				vscode.window.showErrorMessage(t("common:errors.create_mcp_json", { error: `${error}` }))
			}
			break
		}
		case "openCustomModesSettings": {
			const customModesFilePath = await provider.customModesManager.getCustomModesFilePath()
			if (customModesFilePath) {
				openFile(customModesFilePath)
			}
			break
		}
		case "deleteMcpServer": {
			if (!message.serverName) {
				break
			}

			try {
				provider.log(`Attempting to delete MCP server: ${message.serverName}`)
				await provider.getMcpHub()?.deleteServer(message.serverName, message.source as "global" | "project")
				provider.log(`Successfully deleted MCP server: ${message.serverName}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Failed to delete MCP server: ${errorMessage}`)
				// Error messages are already handled by McpHub.deleteServer
			}
			break
		}
		case "restartMcpServer": {
			try {
				await provider.getMcpHub()?.restartConnection(message.text!, message.source as "global" | "project")
			} catch (error) {
				provider.log(
					`Failed to retry connection for ${message.text}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleToolAlwaysAllow": {
			try {
				await provider
					.getMcpHub()
					?.toggleToolAlwaysAllow(
						message.serverName!,
						message.source as "global" | "project",
						message.toolName!,
						Boolean(message.alwaysAllow),
					)
			} catch (error) {
				provider.log(
					`Failed to toggle auto-approve for tool ${message.toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleMcpServer": {
			try {
				await provider
					.getMcpHub()
					?.toggleServerDisabled(
						message.serverName!,
						message.disabled!,
						message.source as "global" | "project",
					)
			} catch (error) {
				provider.log(
					`Failed to toggle MCP server ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "mcpEnabled":
			const mcpEnabled = message.bool ?? true
			await updateGlobalState("mcpEnabled", mcpEnabled)
			await provider.postStateToWebview()
			break
		case "enableMcpServerCreation":
			await updateGlobalState("enableMcpServerCreation", message.bool ?? true)
			await provider.postStateToWebview()
			break
		case "playSound":
			if (message.audioType) {
				const soundPath = path.join(provider.context.extensionPath, "audio", `${message.audioType}.wav`)
				playSound(soundPath)
			}
			break
		case "soundEnabled":
			const soundEnabled = message.bool ?? true
			await updateGlobalState("soundEnabled", soundEnabled)
			setSoundEnabled(soundEnabled) // Add this line to update the sound utility
			await provider.postStateToWebview()
			break
		case "soundVolume":
			const soundVolume = message.value ?? 0.5
			await updateGlobalState("soundVolume", soundVolume)
			setSoundVolume(soundVolume)
			await provider.postStateToWebview()
			break
		case "ttsEnabled":
			const ttsEnabled = message.bool ?? true
			await updateGlobalState("ttsEnabled", ttsEnabled)
			setTtsEnabled(ttsEnabled) // Add this line to update the tts utility
			await provider.postStateToWebview()
			break
		case "ttsSpeed":
			const ttsSpeed = message.value ?? 1.0
			await updateGlobalState("ttsSpeed", ttsSpeed)
			setTtsSpeed(ttsSpeed)
			await provider.postStateToWebview()
			break
		case "playTts":
			if (message.text) {
				playTts(message.text, {
					onStart: () => provider.postMessageToWebview({ type: "ttsStart", text: message.text }),
					onStop: () => provider.postMessageToWebview({ type: "ttsStop", text: message.text }),
				})
			}
			break
		case "stopTts":
			stopTts()
			break
		case "diffEnabled":
			const diffEnabled = message.bool ?? true
			await updateGlobalState("diffEnabled", diffEnabled)
			await provider.postStateToWebview()
			break
		case "enableCheckpoints":
			const enableCheckpoints = message.bool ?? true
			await updateGlobalState("enableCheckpoints", enableCheckpoints)
			await provider.postStateToWebview()
			break
		case "browserViewportSize":
			const browserViewportSize = message.text ?? "900x600"
			await updateGlobalState("browserViewportSize", browserViewportSize)
			await provider.postStateToWebview()
			break
		case "remoteBrowserHost":
			await updateGlobalState("remoteBrowserHost", message.text)
			await provider.postStateToWebview()
			break
		case "remoteBrowserEnabled":
			// Store the preference in global state
			// remoteBrowserEnabled now means "enable remote browser connection"
			await updateGlobalState("remoteBrowserEnabled", message.bool ?? false)
			// If disabling remote browser connection, clear the remoteBrowserHost
			if (!message.bool) {
				await updateGlobalState("remoteBrowserHost", undefined)
			}
			await provider.postStateToWebview()
			break
		case "testBrowserConnection":
			// If no text is provided, try auto-discovery
			if (!message.text) {
				// Use testBrowserConnection for auto-discovery
				const chromeHostUrl = await discoverChromeHostUrl()
				if (chromeHostUrl) {
					// Send the result back to the webview
					await provider.postMessageToWebview({
						type: "browserConnectionResult",
						success: !!chromeHostUrl,
						text: `Auto-discovered and tested connection to Chrome: ${chromeHostUrl}`,
						values: { endpoint: chromeHostUrl },
					})
				} else {
					await provider.postMessageToWebview({
						type: "browserConnectionResult",
						success: false,
						text: "No Chrome instances found on the network. Make sure Chrome is running with remote debugging enabled (--remote-debugging-port=9222).",
					})
				}
			} else {
				// Test the provided URL
				const customHostUrl = message.text
				const hostIsValid = await tryChromeHostUrl(message.text)
				// Send the result back to the webview
				await provider.postMessageToWebview({
					type: "browserConnectionResult",
					success: hostIsValid,
					text: hostIsValid
						? `Successfully connected to Chrome: ${customHostUrl}`
						: "Failed to connect to Chrome",
				})
			}
			break
		case "fuzzyMatchThreshold":
			await updateGlobalState("fuzzyMatchThreshold", message.value)
			await provider.postStateToWebview()
			break
		case "alwaysApproveResubmit":
			await updateGlobalState("alwaysApproveResubmit", message.bool ?? false)
			await provider.postStateToWebview()
			break
		case "requestDelaySeconds":
			await updateGlobalState("requestDelaySeconds", message.value ?? 5)
			await provider.postStateToWebview()
			break
		case "writeDelayMs":
			await updateGlobalState("writeDelayMs", message.value)
			await provider.postStateToWebview()
			break
		case "terminalOutputLineLimit":
			await updateGlobalState("terminalOutputLineLimit", message.value)
			await provider.postStateToWebview()
			break
		case "terminalShellIntegrationTimeout":
			await updateGlobalState("terminalShellIntegrationTimeout", message.value)
			await provider.postStateToWebview()
			if (message.value !== undefined) {
				Terminal.setShellIntegrationTimeout(message.value)
			}
			break
		case "terminalShellIntegrationDisabled":
			await updateGlobalState("terminalShellIntegrationDisabled", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setShellIntegrationDisabled(message.bool)
			}
			break
		case "terminalCommandDelay":
			await updateGlobalState("terminalCommandDelay", message.value)
			await provider.postStateToWebview()
			if (message.value !== undefined) {
				Terminal.setCommandDelay(message.value)
			}
			break
		case "terminalPowershellCounter":
			await updateGlobalState("terminalPowershellCounter", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setPowershellCounter(message.bool)
			}
			break
		case "terminalZshClearEolMark":
			await updateGlobalState("terminalZshClearEolMark", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setTerminalZshClearEolMark(message.bool)
			}
			break
		case "terminalZshOhMy":
			await updateGlobalState("terminalZshOhMy", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setTerminalZshOhMy(message.bool)
			}
			break
		case "terminalZshP10k":
			await updateGlobalState("terminalZshP10k", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setTerminalZshP10k(message.bool)
			}
			break
		case "terminalZdotdir":
			await updateGlobalState("terminalZdotdir", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setTerminalZdotdir(message.bool)
			}
			break
		case "terminalCompressProgressBar":
			await updateGlobalState("terminalCompressProgressBar", message.bool)
			await provider.postStateToWebview()
			if (message.bool !== undefined) {
				Terminal.setCompressProgressBar(message.bool)
			}
			break
		case "mode":
			await provider.handleModeSwitch(message.text as Mode)
			break
		case "updateSupportPrompt":
			try {
				if (Object.keys(message?.values ?? {}).length === 0) {
					return
				}

				const existingPrompts = getGlobalState("customSupportPrompts") ?? {}
				const updatedPrompts = { ...existingPrompts, ...message.values }
				await updateGlobalState("customSupportPrompts", updatedPrompts)
				await provider.postStateToWebview()
			} catch (error) {
				provider.log(
					`Error update support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.update_support_prompt"))
			}
			break
		case "resetSupportPrompt":
			try {
				if (!message?.text) {
					return
				}

				const existingPrompts = getGlobalState("customSupportPrompts") ?? {}
				const updatedPrompts = { ...existingPrompts }
				updatedPrompts[message.text] = undefined
				await updateGlobalState("customSupportPrompts", updatedPrompts)
				await provider.postStateToWebview()
			} catch (error) {
				provider.log(
					`Error reset support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.reset_support_prompt"))
			}
			break
		case "updatePrompt":
			if (message.promptMode && message.customPrompt !== undefined) {
				const existingPrompts = getGlobalState("customModePrompts") ?? {}
				const updatedPrompts = { ...existingPrompts, [message.promptMode]: message.customPrompt }
				await updateGlobalState("customModePrompts", updatedPrompts)
				const currentState = await provider.getStateToPostToWebview()
				const stateWithPrompts = { ...currentState, customModePrompts: updatedPrompts }
				provider.postMessageToWebview({ type: "state", state: stateWithPrompts })
			}
			break
		case "deleteMessage": {
			const answer = await vscode.window.showInformationMessage(
				t("common:confirmation.delete_message"),
				{ modal: true },
				t("common:confirmation.just_this_message"),
				t("common:confirmation.this_and_subsequent"),
			)

			if (
				(answer === t("common:confirmation.just_this_message") ||
					answer === t("common:confirmation.this_and_subsequent")) &&
				provider.getCurrentCline() &&
				typeof message.value === "number" &&
				message.value
			) {
				const timeCutoff = message.value - 1000 // 1 second buffer before the message to delete

				const messageIndex = provider
					.getCurrentCline()!
					.clineMessages.findIndex((msg) => msg.ts && msg.ts >= timeCutoff)

				const apiConversationHistoryIndex = provider
					.getCurrentCline()
					?.apiConversationHistory.findIndex((msg) => msg.ts && msg.ts >= timeCutoff)

				if (messageIndex !== -1) {
					const { historyItem } = await provider.getTaskWithId(provider.getCurrentCline()!.taskId)

					if (answer === t("common:confirmation.just_this_message")) {
						// Find the next user message first
						const nextUserMessage = provider
							.getCurrentCline()!
							.clineMessages.slice(messageIndex + 1)
							.find((msg) => msg.type === "say" && msg.say === "user_feedback")

						// Handle UI messages
						if (nextUserMessage) {
							// Find absolute index of next user message
							const nextUserMessageIndex = provider
								.getCurrentCline()!
								.clineMessages.findIndex((msg) => msg === nextUserMessage)

							// Keep messages before current message and after next user message
							await provider
								.getCurrentCline()!
								.overwriteClineMessages([
									...provider.getCurrentCline()!.clineMessages.slice(0, messageIndex),
									...provider.getCurrentCline()!.clineMessages.slice(nextUserMessageIndex),
								])
						} else {
							// If no next user message, keep only messages before current message
							await provider
								.getCurrentCline()!
								.overwriteClineMessages(
									provider.getCurrentCline()!.clineMessages.slice(0, messageIndex),
								)
						}

						// Handle API messages
						if (apiConversationHistoryIndex !== -1) {
							if (nextUserMessage && nextUserMessage.ts) {
								// Keep messages before current API message and after next user message
								await provider
									.getCurrentCline()!
									.overwriteApiConversationHistory([
										...provider
											.getCurrentCline()!
											.apiConversationHistory.slice(0, apiConversationHistoryIndex),
										...provider
											.getCurrentCline()!
											.apiConversationHistory.filter(
												(msg) => msg.ts && msg.ts >= nextUserMessage.ts,
											),
									])
							} else {
								// If no next user message, keep only messages before current API message
								await provider
									.getCurrentCline()!
									.overwriteApiConversationHistory(
										provider
											.getCurrentCline()!
											.apiConversationHistory.slice(0, apiConversationHistoryIndex),
									)
							}
						}
					} else if (answer === t("common:confirmation.this_and_subsequent")) {
						// Delete this message and all that follow
						await provider
							.getCurrentCline()!
							.overwriteClineMessages(provider.getCurrentCline()!.clineMessages.slice(0, messageIndex))
						if (apiConversationHistoryIndex !== -1) {
							await provider
								.getCurrentCline()!
								.overwriteApiConversationHistory(
									provider
										.getCurrentCline()!
										.apiConversationHistory.slice(0, apiConversationHistoryIndex),
								)
						}
					}

					await provider.initClineWithHistoryItem(historyItem)
				}
			}
			break
		}
		case "screenshotQuality":
			await updateGlobalState("screenshotQuality", message.value)
			await provider.postStateToWebview()
			break
		case "maxOpenTabsContext":
			const tabCount = Math.min(Math.max(0, message.value ?? 20), 500)
			await updateGlobalState("maxOpenTabsContext", tabCount)
			await provider.postStateToWebview()
			break
		case "maxWorkspaceFiles":
			const fileCount = Math.min(Math.max(0, message.value ?? 200), 500)
			await updateGlobalState("maxWorkspaceFiles", fileCount)
			await provider.postStateToWebview()
			break
		case "browserToolEnabled":
			await updateGlobalState("browserToolEnabled", message.bool ?? true)
			await provider.postStateToWebview()
			break
		case "language":
			changeLanguage(message.text ?? "en")
			await updateGlobalState("language", message.text as Language)
			await provider.postStateToWebview()
			break
		case "showRooIgnoredFiles":
			await updateGlobalState("showRooIgnoredFiles", message.bool ?? true)
			await provider.postStateToWebview()
			break
		case "maxReadFileLine":
			await updateGlobalState("maxReadFileLine", message.value)
			await provider.postStateToWebview()
			break
		case "setHistoryPreviewCollapsed": // Add the new case handler
			await updateGlobalState("historyPreviewCollapsed", message.bool ?? false)
			// No need to call postStateToWebview here as the UI already updated optimistically
			break
		case "toggleApiConfigPin":
			if (message.text) {
				const currentPinned = getGlobalState("pinnedApiConfigs") ?? {}
				const updatedPinned: Record<string, boolean> = { ...currentPinned }

				if (currentPinned[message.text]) {
					delete updatedPinned[message.text]
				} else {
					updatedPinned[message.text] = true
				}

				await updateGlobalState("pinnedApiConfigs", updatedPinned)
				await provider.postStateToWebview()
			}
			break
		case "enhancementApiConfigId":
			await updateGlobalState("enhancementApiConfigId", message.text)
			await provider.postStateToWebview()
			break
		case "autoApprovalEnabled":
			await updateGlobalState("autoApprovalEnabled", message.bool ?? false)
			await provider.postStateToWebview()
			break
		case "enhancePrompt":
			if (message.text) {
				try {
					const { apiConfiguration, customSupportPrompts, listApiConfigMeta, enhancementApiConfigId } =
						await provider.getState()

					// Try to get enhancement config first, fall back to current config
					let configToUse: ApiConfiguration = apiConfiguration
					if (enhancementApiConfigId) {
						const config = listApiConfigMeta?.find((c: ApiConfigMeta) => c.id === enhancementApiConfigId)
						if (config?.name) {
							const loadedConfig = await provider.providerSettingsManager.loadConfig(config.name)
							if (loadedConfig.apiProvider) {
								configToUse = loadedConfig
							}
						}
					}

					const enhancedPrompt = await singleCompletionHandler(
						configToUse,
						supportPrompt.create(
							"ENHANCE",
							{
								userInput: message.text,
							},
							customSupportPrompts,
						),
					)

					// Capture telemetry for prompt enhancement
					const currentCline = provider.getCurrentCline()
					telemetryService.capturePromptEnhanced(currentCline?.taskId)

					await provider.postMessageToWebview({
						type: "enhancedPrompt",
						text: enhancedPrompt,
					})
				} catch (error) {
					provider.log(
						`Error enhancing prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.enhance_prompt"))
					await provider.postMessageToWebview({
						type: "enhancedPrompt",
					})
				}
			}
			break
		case "getSystemPrompt":
			try {
				const systemPrompt = await generateSystemPrompt(provider, message)

				await provider.postMessageToWebview({
					type: "systemPrompt",
					text: systemPrompt,
					mode: message.mode,
				})
			} catch (error) {
				provider.log(
					`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.get_system_prompt"))
			}
			break
		case "copySystemPrompt":
			try {
				const systemPrompt = await generateSystemPrompt(provider, message)

				await vscode.env.clipboard.writeText(systemPrompt)
				await vscode.window.showInformationMessage(t("common:info.clipboard_copy"))
			} catch (error) {
				provider.log(
					`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.get_system_prompt"))
			}
			break
		case "searchCommits": {
			const cwd = provider.cwd
			if (cwd) {
				try {
					const commits = await searchCommits(message.query || "", cwd)
					await provider.postMessageToWebview({
						type: "commitSearchResults",
						commits,
					})
				} catch (error) {
					provider.log(
						`Error searching commits: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.search_commits"))
				}
			}
			break
		}
		case "searchFiles": {
			const workspacePath = getWorkspacePath()

			if (!workspacePath) {
				// Handle case where workspace path is not available
				await provider.postMessageToWebview({
					type: "fileSearchResults",
					results: [],
					requestId: message.requestId,
					error: "No workspace path available",
				})
				break
			}
			try {
				// Call file search service with query from message
				const results = await searchWorkspaceFiles(
					message.query || "",
					workspacePath,
					20, // Use default limit, as filtering is now done in the backend
				)

				// Send results back to webview
				await provider.postMessageToWebview({
					type: "fileSearchResults",
					results,
					requestId: message.requestId,
				})
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)

				// Send error response to webview
				await provider.postMessageToWebview({
					type: "fileSearchResults",
					results: [],
					error: errorMessage,
					requestId: message.requestId,
				})
			}
			break
		}
		case "saveApiConfiguration":
			if (message.text && message.apiConfiguration) {
				try {
					await provider.providerSettingsManager.saveConfig(message.text, message.apiConfiguration)
					const listApiConfig = await provider.providerSettingsManager.listConfig()
					await updateGlobalState("listApiConfigMeta", listApiConfig)
				} catch (error) {
					provider.log(
						`Error save api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.save_api_config"))
				}
			}
			break
		case "upsertApiConfiguration":
			if (message.text && message.apiConfiguration) {
				await provider.upsertApiConfiguration(message.text, message.apiConfiguration)
			}
			break
		case "renameApiConfiguration":
			if (message.values && message.apiConfiguration) {
				try {
					const { oldName, newName } = message.values

					if (oldName === newName) {
						break
					}

					// Load the old configuration to get its ID
					const oldConfig = await provider.providerSettingsManager.loadConfig(oldName)

					// Create a new configuration with the same ID
					const newConfig = {
						...message.apiConfiguration,
						id: oldConfig.id, // Preserve the ID
					}

					// Save with the new name but same ID
					await provider.providerSettingsManager.saveConfig(newName, newConfig)
					await provider.providerSettingsManager.deleteConfig(oldName)

					const listApiConfig = await provider.providerSettingsManager.listConfig()

					// Update listApiConfigMeta first to ensure UI has latest data
					await updateGlobalState("listApiConfigMeta", listApiConfig)
					await updateGlobalState("currentApiConfigName", newName)

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error rename api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.rename_api_config"))
				}
			}
			break
		case "loadApiConfiguration":
			if (message.text) {
				try {
					const apiConfig = await provider.providerSettingsManager.loadConfig(message.text)
					const listApiConfig = await provider.providerSettingsManager.listConfig()

					await Promise.all([
						updateGlobalState("listApiConfigMeta", listApiConfig),
						updateGlobalState("currentApiConfigName", message.text),
						provider.updateApiConfiguration(apiConfig),
					])

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error load api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.load_api_config"))
				}
			}
			break
		case "loadApiConfigurationById":
			if (message.text) {
				try {
					const { config: apiConfig, name } = await provider.providerSettingsManager.loadConfigById(
						message.text,
					)
					const listApiConfig = await provider.providerSettingsManager.listConfig()

					await Promise.all([
						updateGlobalState("listApiConfigMeta", listApiConfig),
						updateGlobalState("currentApiConfigName", name),
						provider.updateApiConfiguration(apiConfig),
					])

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error load api configuration by ID: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.load_api_config"))
				}
			}
			break
		case "deleteApiConfiguration":
			if (message.text) {
				const answer = await vscode.window.showInformationMessage(
					t("common:confirmation.delete_config_profile"),
					{ modal: true },
					t("common:answers.yes"),
				)

				if (answer !== t("common:answers.yes")) {
					break
				}

				try {
					await provider.providerSettingsManager.deleteConfig(message.text)
					const listApiConfig = await provider.providerSettingsManager.listConfig()

					// Update listApiConfigMeta first to ensure UI has latest data
					await updateGlobalState("listApiConfigMeta", listApiConfig)

					// If this was the current config, switch to first available
					const currentApiConfigName = getGlobalState("currentApiConfigName")

					if (message.text === currentApiConfigName && listApiConfig?.[0]?.name) {
						const apiConfig = await provider.providerSettingsManager.loadConfig(listApiConfig[0].name)
						await Promise.all([
							updateGlobalState("currentApiConfigName", listApiConfig[0].name),
							provider.updateApiConfiguration(apiConfig),
						])
					}

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error delete api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.delete_api_config"))
				}
			}
			break
		case "getListApiConfiguration":
			try {
				const listApiConfig = await provider.providerSettingsManager.listConfig()
				await updateGlobalState("listApiConfigMeta", listApiConfig)
				provider.postMessageToWebview({ type: "listApiConfig", listApiConfig })
			} catch (error) {
				provider.log(
					`Error get list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.list_api_config"))
			}
			break
		case "updateExperimental": {
			if (!message.values) {
				break
			}

			const updatedExperiments = {
				...(getGlobalState("experiments") ?? experimentDefault),
				...message.values,
			}

			await updateGlobalState("experiments", updatedExperiments)

			await provider.postStateToWebview()
			break
		}
		case "updateMcpTimeout":
			if (message.serverName && typeof message.timeout === "number") {
				try {
					await provider
						.getMcpHub()
						?.updateServerTimeout(
							message.serverName,
							message.timeout,
							message.source as "global" | "project",
						)
				} catch (error) {
					provider.log(
						`Failed to update timeout for ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.update_server_timeout"))
				}
			}
			break
		case "updateCustomMode":
			if (message.modeConfig) {
				await provider.customModesManager.updateCustomMode(message.modeConfig.slug, message.modeConfig)
				// Update state after saving the mode
				const customModes = await provider.customModesManager.getCustomModes()
				await updateGlobalState("customModes", customModes)
				await updateGlobalState("mode", message.modeConfig.slug)
				await provider.postStateToWebview()
			}
			break
		case "deleteCustomMode":
			if (message.slug) {
				const answer = await vscode.window.showInformationMessage(
					t("common:confirmation.delete_custom_mode"),
					{ modal: true },
					t("common:answers.yes"),
				)

				if (answer !== t("common:answers.yes")) {
					break
				}

				await provider.customModesManager.deleteCustomMode(message.slug)
				// Switch back to default mode after deletion
				await updateGlobalState("mode", defaultModeSlug)
				await provider.postStateToWebview()
			}
			break
		case "humanRelayResponse":
			if (message.requestId && message.text) {
				vscode.commands.executeCommand("roo-cline.handleHumanRelayResponse", {
					requestId: message.requestId,
					text: message.text,
					cancelled: false,
				})
			}
			break

		case "humanRelayCancel":
			if (message.requestId) {
				vscode.commands.executeCommand("roo-cline.handleHumanRelayResponse", {
					requestId: message.requestId,
					cancelled: true,
				})
			}
			break

		case "telemetrySetting": {
			const telemetrySetting = message.text as TelemetrySetting
			await updateGlobalState("telemetrySetting", telemetrySetting)
			const isOptedIn = telemetrySetting === "enabled"
			telemetryService.updateTelemetryState(isOptedIn)
			await provider.postStateToWebview()
			break
		}
	}
}

const generateSystemPrompt = async (provider: ClineProvider, message: WebviewMessage) => {
	const {
		apiConfiguration,
		customModePrompts,
		customInstructions,
		browserViewportSize,
		diffEnabled,
		mcpEnabled,
		fuzzyMatchThreshold,
		experiments,
		enableMcpServerCreation,
		browserToolEnabled,
		language,
	} = await provider.getState()

	const diffStrategy = new MultiSearchReplaceDiffStrategy(fuzzyMatchThreshold)

	const cwd = provider.cwd

	const mode = message.mode ?? defaultModeSlug
	const customModes = await provider.customModesManager.getCustomModes()

	const rooIgnoreInstructions = provider.getCurrentCline()?.rooIgnoreController?.getInstructions()

	// Determine if browser tools can be used based on model support, mode, and user settings
	let modelSupportsComputerUse = false

	// Create a temporary API handler to check if the model supports computer use
	// This avoids relying on an active Cline instance which might not exist during preview
	try {
		const tempApiHandler = buildApiHandler(apiConfiguration)
		modelSupportsComputerUse = tempApiHandler.getModel().info.supportsComputerUse ?? false
	} catch (error) {
		console.error("Error checking if model supports computer use:", error)
	}

	// Check if the current mode includes the browser tool group
	const modeConfig = getModeBySlug(mode, customModes)
	const modeSupportsBrowser = modeConfig?.groups.some((group) => getGroupName(group) === "browser") ?? false

	// Only enable browser tools if the model supports it, the mode includes browser tools,
	// and browser tools are enabled in settings
	const canUseBrowserTool = modelSupportsComputerUse && modeSupportsBrowser && (browserToolEnabled ?? true)

	const systemPrompt = await SYSTEM_PROMPT(
		provider.context,
		cwd,
		canUseBrowserTool,
		mcpEnabled ? provider.getMcpHub() : undefined,
		diffStrategy,
		browserViewportSize ?? "900x600",
		mode,
		customModePrompts,
		customModes,
		customInstructions,
		diffEnabled,
		experiments,
		enableMcpServerCreation,
		language,
		rooIgnoreInstructions,
	)

	return systemPrompt
}
