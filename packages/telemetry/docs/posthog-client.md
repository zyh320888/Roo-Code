# PostHog 客户端集成

## 功能概述
telemetry 包的 PostHog 客户端实现，用于将用户行为数据发送到 PostHog 分析平台。

## 核心实现
```typescript
import posthog from 'posthog-js'

class PosthogClient implements TelemetryClient {
  constructor(private apiKey: string, private options: PosthogOptions) {
    posthog.init(apiKey, options)
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    posthog.identify(userId, traits)
  }

  track(event: TelemetryEvent) {
    posthog.capture(event.eventName, event.properties)
  }

  async flush() {
    return posthog.capture('$flush')
  }
}
```

## 配置选项
```typescript
interface PosthogOptions {
  api_host?: string
  autocapture?: boolean
  capture_pageview?: boolean
  disable_session_recording?: boolean
  enable?: boolean
}
```

## 使用示例
```typescript
import { PosthogClient } from './posthog-client'

const client = new PosthogClient('YOUR_POSTHOG_KEY', {
  api_host: 'https://app.posthog.com',
  enable: !isDevelopment,
  disable_session_recording: true
})
```

## 模块关系
- 实现 `TelemetryClient` 接口
- 被 `index-api` 模块包装使用
- 依赖 `posthog-js` npm 包

## 注意事项
1. 仅在用户同意后启用数据收集
2. 生产环境配置不同的项目密钥
3. 考虑 GDPR 合规性要求
4. 会话记录功能默认禁用
5. 本地开发环境应禁用数据上报