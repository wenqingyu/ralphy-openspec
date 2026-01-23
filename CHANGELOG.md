# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-23

### Added
- Initial public release of `ralphy-spec`.
- Astro-powered documentation site with i18n (en/zh/ko/ja).

### Changed
- N/A

### Fixed
- N/A

## [0.3.0] - 2026-01-23

### Added
- Budget intelligence: three-tier budgets (optimal → warning → hard) with hard-cap blocking + failure summaries.
- Sprint semantics: `sprint.size` defaults, `sprint.intent` constraints, and configurable scope guard policy (`off|warn|block`).
- Artifact system: `ralphy-spec/` folder, STATUS/TASKS/BUDGET writers, per-task artifacts, immutable run logs, and `--artifact-dir`.
- New CLI command: `ralphy-spec budget` and a full CLI docs page on the website.
- Test suite (Vitest) covering the above behaviors.

### Changed
- `ralphy-spec run` now supports `worktree` mode and real backend selection (`cursor|opencode|claude-code|noop`).
- Docs + README (all languages) updated to reflect the new artifacts and CLI.

## [0.3.1] - 2026-01-23

### Fixed
- `--backend cursor` now invokes **Cursor Agent** (`cursor agent --print ...`) instead of the editor CLI, and provides a clear error when Cursor Agent authentication is missing.

## [0.3.2] - 2026-01-23

### Changed
- `ralphy-spec run` now streams backend output to the terminal by default. Use `--no-stream-backend` to disable (and `--json` remains non-streaming).

## [0.3.3] - 2026-01-23

### Changed
- `ralphy-spec run` now prints minimal progress updates to stderr (run started, task/iteration, validate), so runs never look “hung” even if the backend is quiet.

## [0.3.4] - 2026-01-23

### Added
- Per-iteration backend transcripts under `ralphy-spec/logs/<runId>/...` (stdout/stderr + metadata), and a backend heartbeat message every 30s while a backend call is running.

## [0.3.5] - 2026-01-23

### Fixed
- Backends now respect task budget time limits (`task.budget.hard.time_minutes`) instead of using a fixed 10-minute timeout. This prevents premature termination of longer tasks.
- Improved timeout detection: backends now explicitly detect and report timeouts (using execa's `timedOut` flag) with actionable error messages suggesting task breakdown or budget increases.
- Backend logs now include timeout information (timedOut flag, timeout duration, actual duration) for better debugging.

### Changed
- Timeout error messages now clearly distinguish between timeouts (with budget context) and other termination causes (crashes, external kills).

