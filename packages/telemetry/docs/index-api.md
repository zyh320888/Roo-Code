# Telemetry 核心API

## 功能概述
telemetry 包的主要入口文件，提供用户行为追踪和数据分析的核心API。

## 主要接口
```typescript
interface TelemetryEvent {
  eventName: string
  properties?: Record<string, unknown>
}

interface TelemetryClient {
  identify(userId: string, traits?: Record<string, unknown>): void
  track(event: TelemetryEvent): void
  flush(): Promise<void>
}
```

## 使用示例
### 基本使用
```typescript
import { createTelemetryClient } from '@roo/telemetry'

const client = createTelemetryClient({
  apiKey: 'YOUR_API_KEY',
  enable: process.env.NODE_ENV === 'production'
})

// 标识用户
client.identify('user123', { plan: 'pro' })

// 追踪事件
client.track({
  eventName: 'button_click',
  properties: { buttonId: 'submit' }
})

// 确保数据发送
await client.flush()
```

## 模块关系
- 依赖 `posthog-client` 进行实际数据收集
- 被 `webview-ui` 和主进程模块使用
- 与 `types` 包共享类型定义

## 注意事项
1. 生产环境才应启用遥测
2. 避免收集敏感用户数据
3. 调用 `flush()` 确保关闭前数据发送完成
4. 事件名称应遵循 `snake_case` 命名规范