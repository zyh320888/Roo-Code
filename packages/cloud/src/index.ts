// Main exports
export { CloudService } from './CloudService.js'
export { ExtensionBridgeService } from './bridge/ExtensionBridgeService.js'

// Additional exports for consumers who need them
export { CloudSettingsService } from './CloudSettingsService.js'
export { CloudShareService } from './CloudShareService.js'
export { CloudAPI } from './CloudAPI.js'
export { WebAuthService } from './WebAuthService.js'
export { StaticTokenAuthService } from './StaticTokenAuthService.js'
export { StaticSettingsService } from './StaticSettingsService.js'
export { CloudTelemetryClient as TelemetryClient } from './TelemetryClient.js'

// Re-export types
export * from './types.js'
export * from './errors.js'
export * from './config.js'