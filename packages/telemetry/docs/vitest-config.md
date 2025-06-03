# Vitest 测试配置 (vitest.config.ts)

## 功能概述
telemetry 包的单元测试配置文件，基于 Vitest 测试框架。

## 关键配置
```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true
    }
  }
})
```

## 主要特性
- 支持 TypeScript 路径映射
- Node.js 测试环境
- 代码覆盖率报告 (V8 引擎)
- 全局测试变量自动注入

## 使用示例
```typescript
import { describe, it, expect } from 'vitest'
import { trackEvent } from '../src'

describe('telemetry', () => {
  it('should track events', () => {
    // 测试代码
  })
})
```

## 注意事项
1. 测试文件需放在 `__tests__` 目录或使用 `.test.ts` 后缀
2. 覆盖率报告生成在 `coverage` 目录
3. 需要安装 `@types/node` 作为开发依赖