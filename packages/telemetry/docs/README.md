# Telemetry 模块文档导航

## 文档列表

1. [概述文档](overview.md) - Telemetry 模块的整体介绍和架构
2. [核心API文档](index-api.md) - 用户行为追踪和数据收集的核心接口
3. [PostHog 客户端集成](posthog-client.md) - PostHog 分析平台的集成实现
4. [TypeScript 配置](tsconfig.md) - 模块的 TypeScript 编译配置
5. [Vitest 测试配置](vitest-config.md) - 单元测试框架配置和覆盖率设置

## 快速开始

```typescript
import { createTelemetryClient } from '@roo/telemetry'

// 初始化客户端
const client = createTelemetryClient({
  apiKey: 'YOUR_API_KEY',
  enable: true
})

// 追踪用户事件
client.track({
  eventName: 'page_view',
  properties: { path: '/home' }
})
```

## 模块功能

- 用户行为数据收集
- 事件追踪和分析
- 多平台集成支持
- 类型安全的API设计
- 完善的测试覆盖