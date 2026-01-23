# ralphy-spec

[English](README.md) | [简体中文](README.zh.md) | [한국어](README.ko.md) | [日本語](README.ja.md)

**规范驱动的 AI 开发 + 迭代执行。** 结合 OpenSpec 和 Ralph 循环，实现可预测的 AI 辅助编码。

**官网：** [https://ralphy-spec.org](https://ralphy-spec.org)
**文档：** [https://ralphy-spec.org/zh/docs/](https://ralphy-spec.org/zh/docs/)
**更新日志：** [https://ralphy-spec.org/zh/changelog/](https://ralphy-spec.org/zh/changelog/) · [GitHub](https://github.com/wenqingyu/ralphy-openspec/blob/main/CHANGELOG.md)

## 快速开始

```bash
npx ralphy-spec init
```

然后使用你的 AI 工具对应的命令：

### Cursor

| 命令 | 功能 |
|------|------|
| `/ralphy-plan` | 从需求创建规范 |
| `/ralphy-implement` | 迭代循环构建 |
| `/ralphy-validate` | 验证验收标准 |
| `/ralphy-archive` | 完成并归档 |

### Claude Code

| 命令 | 功能 |
|------|------|
| `/ralphy-plan` | 从需求创建规范 |
| `/ralphy-implement` | 迭代循环构建 |
| `/ralphy-validate` | 验证验收标准 |
| `/ralphy-archive` | 完成并归档 |

### OpenCode

使用自然语言配合 AGENTS.md：
- `"Follow AGENTS.md to plan [功能]"`
- `"Follow AGENTS.md to implement [变更]"`
- `"Follow AGENTS.md to validate"`
- `"Follow AGENTS.md to archive [变更]"`

**配合 Ralph 循环运行器：**
```bash
npm install -g @th0rgal/ralph-wiggum
ralph "Follow AGENTS.md to implement add-api. Output <promise>TASK_COMPLETE</promise> when done." --max-iterations 20
```

## 工作流示例

```bash
# 1. 规划：从你的想法创建规范
You: /ralphy-plan 添加 JWT 用户认证

# 2. 实现：AI 迭代构建
You: /ralphy-implement add-user-auth

# 3. 验证：确保测试通过
You: /ralphy-validate

# 4. 归档：完成变更
You: /ralphy-archive add-user-auth
```

## 创建的文件

```
.cursor/prompts/          # 或 .claude/commands/
├── ralphy-plan.md
├── ralphy-implement.md
├── ralphy-validate.md
└── ralphy-archive.md

AGENTS.md                 # OpenCode 使用

openspec/
├── specs/                # 真实来源
├── changes/              # 进行中的工作
├── archive/              # 已完成
└── project.md            # 上下文

.ralphy/
├── config.json
└── ralph-loop.state.json
```

## 工作原理

**Ralph Wiggum 循环：** AI 重复接收相同提示直到任务完成。每次迭代，它都能看到文件中的之前工作并自我纠正。

**OpenSpec：** 先有规范后有代码。结构化的规范和验收标准确保 AI 知道要构建什么。

**为什么结合使用：**

| 问题 | 解决方案 |
|------|----------|
| 聊天中的模糊需求 | 规范锁定意图 |
| AI 中途停止 | 循环重试直到完成 |
| 无法验证 | 测试验证输出 |
| 工具特定设置 | 一条命令搞定所有 |

## 安装选项

```bash
# npx（推荐）
npx ralphy-spec init

# 全局安装
npm install -g ralphy-spec
ralphy-spec init

# 指定工具
ralphy-spec init --tools cursor,claude-code,opencode
```

## 致谢

基于以下项目：

- **[Ralph 方法论](https://ghuntley.com/ralph)** by Geoffrey Huntley
- **[opencode-ralph-wiggum](https://github.com/Th0rgal/opencode-ralph-wiggum)** by @Th0rgal  
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** by Fission-AI

## 许可证

BSD-3-Clause
