# Project Context: ralphy-spec

ralphy-spec is a CLI tool that combines OpenSpec (spec-driven development) with Ralph Loop (iterative AI execution) for predictable AI-assisted coding across Cursor, OpenCode, and Claude Code.

## Stack
- Language: TypeScript
- Runtime: Node.js >= 20.19.0
- Package manager: npm
- Build: tsc (TypeScript compiler)

## Architecture (v1)
- CLI framework: commander
- Template-based setup for AI tools
- Supports: Cursor, Claude Code, OpenCode
- Human-governed workflow: plan → implement → validate → archive

## Conventions
- Code style: TypeScript strict mode
- Testing: (to be added)
- CI: GitHub Actions (deploy-docs.yml)
- File structure: src/commands/, src/utils/, src/templates/

## Key Directories
- `src/commands/` - CLI command implementations
- `src/utils/` - Shared utilities (detector, installer, paths, validator)
- `src/templates/` - AI tool prompt templates
- `docs/` - Astro-based documentation site

## External References
- [Ralph Wiggum methodology](https://ghuntley.com/ralph)
- [opencode-ralph-wiggum](https://github.com/Th0rgal/opencode-ralph-wiggum)
- [OpenSpec](https://github.com/Fission-AI/openspec)
