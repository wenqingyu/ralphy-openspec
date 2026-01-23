# ralphy-spec

[English](README.md) | [简体中文](README.zh.md) | [한국어](README.ko.md) | [日本語](README.ja.md)

**スペック駆動AI開発 + 反復実行。** OpenSpecとRalph Loopを組み合わせて、予測可能なAI支援コーディングを実現します。

**ウェブサイト:** [https://ralphy-spec.org](https://ralphy-spec.org)
**ドキュメント:** [https://ralphy-spec.org/ja/docs/](https://ralphy-spec.org/ja/docs/)
**変更履歴:** [https://ralphy-spec.org/ja/changelog/](https://ralphy-spec.org/ja/changelog/) · [GitHub](https://github.com/wenqingyu/ralphy-openspec/blob/main/CHANGELOG.md)

## クイックスタート

```bash
npx ralphy-spec init
```

CLI 基本:

```bash
ralphy-spec run --dry-run
ralphy-spec run
ralphy-spec status
ralphy-spec budget --json
```

次に、AIツールに対応するコマンドを使用します：

### Cursor

| コマンド | 機能 |
|----------|------|
| `/ralphy-plan` | 要件からスペック作成 |
| `/ralphy-implement` | 反復ループでビルド |
| `/ralphy-validate` | 受け入れ基準を検証 |
| `/ralphy-archive` | 完了してアーカイブ |

### Claude Code

| コマンド | 機能 |
|----------|------|
| `/ralphy-plan` | 要件からスペック作成 |
| `/ralphy-implement` | 反復ループでビルド |
| `/ralphy-validate` | 受け入れ基準を検証 |
| `/ralphy-archive` | 完了してアーカイブ |

### OpenCode

AGENTS.mdと自然言語を使用：
- `"Follow AGENTS.md to plan [機能]"`
- `"Follow AGENTS.md to implement [変更]"`
- `"Follow AGENTS.md to validate"`
- `"Follow AGENTS.md to archive [変更]"`

**Ralph Loopランナーと一緒に:**
```bash
npm install -g @th0rgal/ralph-wiggum
ralph "Follow AGENTS.md to implement add-api. Output <promise>TASK_COMPLETE</promise> when done." --max-iterations 20
```

## ワークフロー例

```bash
# 1. 計画: アイデアからスペック作成
You: /ralphy-plan JWT ユーザー認証を追加

# 2. 実装: AIが反復的にビルド
You: /ralphy-implement add-user-auth

# 3. 検証: テストパスを確認
You: /ralphy-validate

# 4. アーカイブ: 変更を完了
You: /ralphy-archive add-user-auth
```

## 作成されるファイル

```
.cursor/prompts/          # または .claude/commands/
├── ralphy-plan.md
├── ralphy-implement.md
├── ralphy-validate.md
└── ralphy-archive.md

AGENTS.md                 # OpenCode用

openspec/
├── specs/                # 真実の情報源
├── changes/              # 進行中の作業
├── archive/              # 完了
└── project.md            # コンテキスト

ralphy-spec/              # ローカル状態 + アーティファクト（IDE向け）
├── state.db              # SQLite 実行/タスクログ
├── STATUS.md             # ライブ状態（`ralphy-spec status` が優先）
├── TASKS.md              # タスクボード
├── BUDGET.md             # コスト/予算
├── runs/                 # 不変の実行ログ（`runs/<runId>.md`）
├── logs/                 # バックエンド出力（ベストエフォート）
├── worktrees/            # Git worktree（worktreeモード時）
└── tasks/                # タスク別アーティファクト（CONTEXT / REPAIR / NOTES）
    └── <taskId>/
        ├── CONTEXT.md
        ├── REPAIR.md
        └── NOTES.md
```

> 注: 既存の `.ralphy/` フォルダが見つかった場合、`ralphy-spec/` へ自動的に移行します。

## 仕組み

**Ralph Wiggum Loop:** AIがタスク完了まで同じプロンプトを繰り返し受け取ります。各イテレーションで、ファイルの以前の作業を見て自己修正します。

**OpenSpec:** コードの前にスペック。構造化されたスペックと受け入れ基準により、AIが何をビルドすべきか正確に分かります。

**組み合わせる理由：**

| 問題 | 解決策 |
|------|--------|
| チャットの曖昧な要件 | スペックが意図を固定 |
| AIが途中で停止 | 完了するまでループがリトライ |
| 検証方法がない | テストが出力を検証 |
| ツール固有のセットアップ | 1つのコマンドですべて解決 |

## インストールオプション

```bash
# npx（推奨）
npx ralphy-spec init

# グローバルインストール
npm install -g ralphy-spec
ralphy-spec init

# 特定のツールを指定
ralphy-spec init --tools cursor,claude-code,opencode
```

## 謝辞

以下のプロジェクトに基づいています：

- **[Ralph方法論](https://ghuntley.com/ralph)** by Geoffrey Huntley
- **[opencode-ralph-wiggum](https://github.com/Th0rgal/opencode-ralph-wiggum)** by @Th0rgal  
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** by Fission-AI

## ライセンス

BSD-3-Clause
