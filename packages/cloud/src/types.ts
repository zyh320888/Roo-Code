import EventEmitter from 'events';

import { z } from 'zod';

import {
  RooCodeEventName,
  TaskStatus,
  globalSettingsSchema,
  mcpMarketplaceItemSchema,
  discriminatedProviderSettingsWithIdSchema,
  taskMetadataSchema,
  clineMessageSchema,
  staticAppPropertiesSchema,
  gitPropertiesSchema,
} from '@roo-code/types';

/**
 * CloudUserInfo
 */

export interface CloudUserInfo {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  organizationId?: string;
  organizationName?: string;
  organizationRole?: string;
  organizationImageUrl?: string;
  extensionBridgeEnabled?: boolean;
}

/**
 * CloudOrganization
 */

export interface CloudOrganization {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
  has_image?: boolean;
  created_at?: number;
  updated_at?: number;
}

/**
 * CloudOrganizationMembership
 */

export interface CloudOrganizationMembership {
  id: string;
  organization: CloudOrganization;
  role: string;
  permissions?: string[];
  created_at?: number;
  updated_at?: number;
}

/**
 * OrganizationAllowList
 */

export const organizationAllowListSchema = z.object({
  allowAll: z.boolean(),
  providers: z.record(
    z.object({
      allowAll: z.boolean(),
      models: z.array(z.string()).optional(),
    }),
  ),
});

export type OrganizationAllowList = z.infer<typeof organizationAllowListSchema>;

/**
 * OrganizationDefaultSettings
 */

export const organizationDefaultSettingsSchema = z.object({
  enableCheckpoints: z.boolean().optional(),
  fuzzyMatchThreshold: z.number().optional(),
  maxOpenTabsContext: z.number().int().nonnegative().optional(),
  maxReadFileLine: z.number().int().gte(-1).optional(),
  maxWorkspaceFiles: z.number().int().nonnegative().optional(),
  showRooIgnoredFiles: z.boolean().optional(),
  terminalCommandDelay: z.number().int().nonnegative().optional(),
  terminalCompressProgressBar: z.boolean().optional(),
  terminalOutputLineLimit: z.number().int().nonnegative().optional(),
  terminalShellIntegrationDisabled: z.boolean().optional(),
  terminalShellIntegrationTimeout: z.number().int().nonnegative().optional(),
  terminalZshClearEolMark: z.boolean().optional(),
});

export type OrganizationDefaultSettings = z.infer<
  typeof organizationDefaultSettingsSchema
>;

/**
 * OrganizationCloudSettings
 */

export const organizationCloudSettingsSchema = z.object({
  recordTaskMessages: z.boolean().optional(),
  enableTaskSharing: z.boolean().optional(),
  taskShareExpirationDays: z.number().int().positive().optional(),
  allowMembersViewAllTasks: z.boolean().optional(),
});

export type OrganizationCloudSettings = z.infer<
  typeof organizationCloudSettingsSchema
>;

/**
 * OrganizationSettings
 */

export const organizationSettingsSchema = z.object({
  version: z.number(),
  cloudSettings: z.object({
    recordTaskMessages: z.boolean().optional(),
    enableTaskSharing: z.boolean().optional(),
    taskShareExpirationDays: z.number().int().positive().optional(),
    allowMembersViewAllTasks: z.boolean().optional(),
  }).optional(),
  defaultSettings: organizationDefaultSettingsSchema,
  allowList: z.object({
    allowAll: z.boolean(),
    providers: z.record(
      z.object({
        allowAll: z.boolean(),
        models: z.array(z.string()).optional(),
      }),
    ),
  }),
  hiddenMcps: z.array(z.string()).optional(),
  hideMarketplaceMcps: z.boolean().optional(),
  mcps: z.array(z.object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    isOfficial: z.boolean(),
    isVerified: z.boolean(),
    publisher: z.string(),
    homepage: z.string().optional(),
    repository: z.string().optional(),
    versions: z.array(z.object({
      version: z.string(),
      description: z.string(),
      requires: z.array(z.string()).optional(),
      parameters: z.array(z.object({
        key: z.string(),
        type: z.string(),
        description: z.string(),
        required: z.boolean(),
      })).optional(),
    })),
  })).optional(),
  providerProfiles: z.record(z.string(), z.object({
    id: z.string(),
    name: z.string(),
    apiProvider: z.enum([
      "anthropic",
      "claude-code",
      "glama",
      "openrouter",
      "bedrock",
      "vertex",
      "openai",
      "ollama",
      "vscode-lm",
      "lmstudio",
      "gemini",
      "gemini-cli",
      "openai-native",
      "mistral",
      "moonshot",
      "deepseek",
      "doubao",
      "unbound",
      "requesty",
      "human-relay",
      "fake-ai",
      "xai",
      "groq",
      "chutes",
      "litellm",
      "huggingface",
      "mycustomai",
      "cerebras",
      "sambanova",
      "zai",
      "fireworks",
      "io-intelligence"
    ]),
    apiModelId: z.string(),
    apiKey: z.string().optional(),
    apiBaseUrl: z.string().optional(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
    includeMaxTokens: z.boolean().optional(),
    description: z.string().optional(),
    group: z.string().optional(),
    supportsPromptCache: z.boolean().optional(),
    cacheWritesPrice: z.number().optional(),
    cacheReadsPrice: z.number().optional(),
    inputPrice: z.number().optional(),
    outputPrice: z.number().optional(),
    maxImages: z.number().optional(),
    maxCompletionTokens: z.number().optional(),
    systemPrompt: z.string().optional(),
    systemPromptEnabled: z.boolean().optional(),
    customInstructions: z.string().optional(),
    customInstructionsEnabled: z.boolean().optional(),
    autoApprove: z.array(z.string()).optional(),
    writeDelayMs: z.number().optional(),
    modelMaxTokens: z.number().optional(),
    modelMaxThinkingTokens: z.number().optional(),
    modelTemperature: z.number().optional(),
    modelTopP: z.number().optional(),
    modelTopK: z.number().optional(),
    modelIncludeMaxTokens: z.boolean().optional(),
    modelMaxCompletionTokens: z.number().optional(),
    modelSupportsPromptCache: z.boolean().optional(),
    modelCacheWritesPrice: z.number().optional(),
    modelCacheReadsPrice: z.number().optional(),
    modelInputPrice: z.number().optional(),
    modelOutputPrice: z.number().optional(),
    modelMaxImages: z.number().optional(),
    modelDescription: z.string().optional(),
    modelGroup: z.string().optional(),
    modelSystemPrompt: z.string().optional(),
    modelSystemPromptEnabled: z.boolean().optional(),
    modelCustomInstructions: z.string().optional(),
    modelCustomInstructionsEnabled: z.boolean().optional(),
    modelAutoApprove: z.array(z.string()).optional(),
    modelWriteDelayMs: z.number().optional(),
  })).optional(),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

/**
 * Constants
 */

export const ORGANIZATION_ALLOW_ALL: OrganizationAllowList = {
  allowAll: true,
  providers: {},
} as const;

export const ORGANIZATION_DEFAULT: OrganizationSettings = {
  version: 0,
  cloudSettings: {
    recordTaskMessages: true,
    enableTaskSharing: true,
    taskShareExpirationDays: 30,
    allowMembersViewAllTasks: true,
  },
  defaultSettings: {},
  allowList: ORGANIZATION_ALLOW_ALL,
} as const;

/**
 * ShareVisibility
 */

export type ShareVisibility = 'organization' | 'public';

/**
 * ShareResponse
 */

export const shareResponseSchema = z.object({
  success: z.boolean(),
  shareUrl: z.string().optional(),
  error: z.string().optional(),
  isNewShare: z.boolean().optional(),
  manageUrl: z.string().optional(),
});

export type ShareResponse = z.infer<typeof shareResponseSchema>;

/**
 * AuthService
 */

export type AuthState =
  | 'initializing'
  | 'logged-out'
  | 'active-session'
  | 'attempting-session'
  | 'inactive-session';

export interface AuthService extends EventEmitter<AuthServiceEvents> {
  // Lifecycle
  initialize(): Promise<void>;

  // Authentication methods
  login(): Promise<void>;
  logout(): Promise<void>;
  handleCallback(
    code: string | null,
    state: string | null,
    organizationId?: string | null,
  ): Promise<void>;

  // State methods
  getState(): AuthState;
  isAuthenticated(): boolean;
  hasActiveSession(): boolean;
  hasOrIsAcquiringActiveSession(): boolean;

  // Token and user info
  getSessionToken(): string | undefined;
  getUserInfo(): CloudUserInfo | null;
  getStoredOrganizationId(): string | null;
}

/**
 * AuthServiceEvents
 */

export interface AuthServiceEvents {
  'auth-state-changed': [
    data: {
      state: AuthState;
      previousState: AuthState;
    },
  ];
  'user-info': [data: { userInfo: CloudUserInfo }];
}

/**
 * SettingsService
 */

/**
 * Interface for settings services that provide organization settings
 */
export interface SettingsService {
  /**
   * Get the organization allow list
   * @returns The organization allow list or default if none available
   */
  getAllowList(): OrganizationAllowList;

  /**
   * Get the current organization settings
   * @returns The organization settings or undefined if none available
   */
  getSettings(): OrganizationSettings | undefined;

  /**
   * Dispose of the settings service and clean up resources
   */
  dispose(): void;
}

/**
 * SettingsServiceEvents
 */

export interface SettingsServiceEvents {
  'settings-updated': [
    data: {
      settings: OrganizationSettings;
      previousSettings: OrganizationSettings | undefined;
    },
  ];
}

/**
 * CloudServiceEvents
 */

export type CloudServiceEvents = AuthServiceEvents & SettingsServiceEvents;

/**
 * ConnectionState
 */

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RETRYING = 'retrying',
  FAILED = 'failed',
}

/**
 * RetryConfig
 */

export interface RetryConfig {
  maxInitialAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Constants
 */

export const HEARTBEAT_INTERVAL_MS = 20_000;
export const INSTANCE_TTL_SECONDS = 60;

/**
 * ExtensionTask
 */

const extensionTaskSchema = z.object({
  taskId: z.string(),
  taskStatus: z.nativeEnum(TaskStatus),
  task: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type ExtensionTask = z.infer<typeof extensionTaskSchema>;

/**
 * ExtensionInstance
 */

export const extensionInstanceSchema = z.object({
  instanceId: z.string(),
  userId: z.string(),
  workspacePath: z.string(),
  appProperties: z.object({
    appName: z.string(),
    appVersion: z.string(),
    vscodeVersion: z.string(),
    platform: z.string(),
    editorName: z.string(),
  }),
  gitProperties: z.object({
    repositoryUrl: z.string().optional(),
    repositoryName: z.string().optional(),
    defaultBranch: z.string().optional(),
  }).optional(),
  lastHeartbeat: z.coerce.number(),
  task: extensionTaskSchema,
  taskAsk: z.object({
    ts: z.number(),
    type: z.union([z.literal("ask"), z.literal("say")]),
    ask: z.enum([
      "followup",
      "command",
      "command_output",
      "completion_result",
      "tool",
      "api_req_failed",
      "resume_task",
      "resume_completed_task",
      "mistake_limit_reached",
      "browser_action_launch",
      "use_mcp_server",
      "auto_approval_max_req_reached",
    ]).optional(),
    say: z.enum([
      "error",
      "api_req_started",
      "api_req_finished",
      "api_req_retried",
      "api_req_retry_delayed",
      "api_req_deleted",
      "text",
      "reasoning",
      "completion_result",
      "user_feedback",
      "user_feedback_diff",
      "command_output",
      "shell_integration_warning",
      "browser_action",
      "browser_action_result",
      "mcp_server_request_started",
      "mcp_server_response",
      "subtask_result",
      "checkpoint_saved",
      "rooignore_error",
      "diff_error",
      "condense_context",
      "condense_context_error",
      "codebase_search_result",
      "user_edit_todos",
    ]).optional(),
    text: z.string().optional(),
    images: z.array(z.string()).optional(),
    partial: z.boolean().optional(),
    reasoning: z.string().optional(),
    conversationHistoryIndex: z.number().optional(),
    checkpoint: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  taskHistory: z.array(z.string()),
});

export type ExtensionInstance = z.infer<typeof extensionInstanceSchema>;

/**
 * ExtensionBridgeEvent
 */

export enum ExtensionBridgeEventName {
  TaskCreated = RooCodeEventName.TaskCreated,
  TaskStarted = RooCodeEventName.TaskStarted,
  TaskCompleted = RooCodeEventName.TaskCompleted,
  TaskAborted = RooCodeEventName.TaskAborted,
  TaskFocused = RooCodeEventName.TaskFocused,
  TaskUnfocused = RooCodeEventName.TaskUnfocused,
  TaskActive = RooCodeEventName.TaskActive,
  TaskInteractive = RooCodeEventName.TaskInteractive,
  TaskResumable = RooCodeEventName.TaskResumable,
  TaskIdle = RooCodeEventName.TaskIdle,

  InstanceRegistered = 'instance_registered',
  InstanceUnregistered = 'instance_unregistered',
  HeartbeatUpdated = 'heartbeat_updated',
}

export const extensionBridgeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskCreated),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskStarted),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskCompleted),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskAborted),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskFocused),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskUnfocused),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskActive),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskInteractive),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskResumable),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.TaskIdle),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.InstanceRegistered),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.InstanceUnregistered),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeEventName.HeartbeatUpdated),
    instance: extensionInstanceSchema,
    timestamp: z.number(),
  }),
]);

export type ExtensionBridgeEvent = z.infer<typeof extensionBridgeEventSchema>;

/**
 * ExtensionBridgeCommand
 */

export enum ExtensionBridgeCommandName {
  StartTask = 'start_task',
  StopTask = 'stop_task',
  ResumeTask = 'resume_task',
}

export const extensionBridgeCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ExtensionBridgeCommandName.StartTask),
    instanceId: z.string(),
    payload: z.object({
      text: z.string(),
      images: z.array(z.string()).optional(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeCommandName.StopTask),
    instanceId: z.string(),
    payload: z.object({ taskId: z.string() }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(ExtensionBridgeCommandName.ResumeTask),
    instanceId: z.string(),
    payload: z.object({
      taskId: z.string(),
    }),
    timestamp: z.number(),
  }),
]);

export type ExtensionBridgeCommand = z.infer<
  typeof extensionBridgeCommandSchema
>;

/**
 * TaskBridgeEvent
 */

export enum TaskBridgeEventName {
  Message = RooCodeEventName.Message,
  TaskModeSwitched = RooCodeEventName.TaskModeSwitched,
  TaskInteractive = RooCodeEventName.TaskInteractive,
}

export const taskBridgeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(TaskBridgeEventName.Message),
    taskId: z.string(),
    action: z.string(),
    message: z.object({
      ts: z.number(),
      type: z.union([z.literal("ask"), z.literal("say")]),
      ask: z.enum([
        "followup",
        "command",
        "command_output",
        "completion_result",
        "tool",
        "api_req_failed",
        "resume_task",
        "resume_completed_task",
        "mistake_limit_reached",
        "browser_action_launch",
        "use_mcp_server",
        "auto_approval_max_req_reached",
      ]).optional(),
      say: z.enum([
        "error",
        "api_req_started",
        "api_req_finished",
        "api_req_retried",
        "api_req_retry_delayed",
        "api_req_deleted",
        "text",
        "reasoning",
        "completion_result",
        "user_feedback",
        "user_feedback_diff",
        "command_output",
        "shell_integration_warning",
        "browser_action",
        "browser_action_result",
        "mcp_server_request_started",
        "mcp_server_response",
        "subtask_result",
        "checkpoint_saved",
        "rooignore_error",
        "diff_error",
        "condense_context",
        "condense_context_error",
        "codebase_search_result",
        "user_edit_todos",
      ]).optional(),
      text: z.string().optional(),
      images: z.array(z.string()).optional(),
      partial: z.boolean().optional(),
      reasoning: z.string().optional(),
      conversationHistoryIndex: z.number().optional(),
      checkpoint: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  z.object({
    type: z.literal(TaskBridgeEventName.TaskModeSwitched),
    taskId: z.string(),
    mode: z.string(),
  }),
  z.object({
    type: z.literal(TaskBridgeEventName.TaskInteractive),
    taskId: z.string(),
  }),
]);

export type TaskBridgeEvent = z.infer<typeof taskBridgeEventSchema>;

/**
 * TaskBridgeCommand
 */

export enum TaskBridgeCommandName {
  Message = 'message',
  ApproveAsk = 'approve_ask',
  DenyAsk = 'deny_ask',
}

export const taskBridgeCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(TaskBridgeCommandName.Message),
    taskId: z.string(),
    payload: z.object({
      text: z.string(),
      images: z.array(z.string()).optional(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(TaskBridgeCommandName.ApproveAsk),
    taskId: z.string(),
    payload: z.object({
      text: z.string().optional(),
      images: z.array(z.string()).optional(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal(TaskBridgeCommandName.DenyAsk),
    taskId: z.string(),
    payload: z.object({
      text: z.string().optional(),
      images: z.array(z.string()).optional(),
    }),
    timestamp: z.number(),
  }),
]);

export type TaskBridgeCommand = z.infer<typeof taskBridgeCommandSchema>;

/**
 * ExtensionSocketEvents
 */

export const ExtensionSocketEvents = {
  CONNECTED: 'extension:connected',

  REGISTER: 'extension:register',
  UNREGISTER: 'extension:unregister',

  HEARTBEAT: 'extension:heartbeat',

  EVENT: 'extension:event', // event from extension instance
  RELAYED_EVENT: 'extension:relayed_event', // relay from server

  COMMAND: 'extension:command', // command from user
  RELAYED_COMMAND: 'extension:relayed_command', // relay from server
} as const;

/**
 * TaskSocketEvents
 */

export const TaskSocketEvents = {
  JOIN: 'task:join',
  LEAVE: 'task:leave',

  EVENT: 'task:event', // event from extension task
  RELAYED_EVENT: 'task:relayed_event', // relay from server

  COMMAND: 'task:command', // command from user
  RELAYED_COMMAND: 'task:relayed_command', // relay from server
} as const;
