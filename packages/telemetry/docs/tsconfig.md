# TypeScript 配置 (tsconfig.json)

## 功能概述
telemetry 包的 TypeScript 配置文件，定义了编译选项和类型检查规则。

## 关键配置
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 主要特性
- 继承基础配置 `tsconfig.base.json`
- 启用复合项目模式 (`composite: true`)
- 源文件目录: `./src`
- 输出目录: `./dist`

## 注意事项
1. 修改配置后需要重新构建项目
2. 确保所有类型定义文件 (.d.ts) 包含在编译中
3. 复合项目模式下需要正确配置项目引用