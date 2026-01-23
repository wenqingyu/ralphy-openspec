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

