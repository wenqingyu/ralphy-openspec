# ralphy-spec

[English](README.md) | [简体中文](README.zh.md) | [한국어](README.ko.md) | [日本語](README.ja.md)

**스펙 기반 AI 개발 + 반복 실행.** OpenSpec과 Ralph Loop를 결합하여 예측 가능한 AI 지원 코딩을 실현합니다.

**웹사이트:** [https://ralphy-spec.org](https://ralphy-spec.org)
**문서:** [https://ralphy-spec.org/ko/docs/](https://ralphy-spec.org/ko/docs/)
**변경 로그:** [https://ralphy-spec.org/ko/changelog/](https://ralphy-spec.org/ko/changelog/) · [GitHub](https://github.com/wenqingyu/ralphy-openspec/blob/main/CHANGELOG.md)

## 빠른 시작

```bash
npx ralphy-spec init
```

CLI 기본 사용:

```bash
ralphy-spec run --dry-run
ralphy-spec run
ralphy-spec status
ralphy-spec budget --json
```

그런 다음 AI 도구에 맞는 명령을 사용하세요:

### Cursor

| 명령 | 기능 |
|------|------|
| `/ralphy-plan` | 요구사항에서 스펙 생성 |
| `/ralphy-implement` | 반복 루프로 빌드 |
| `/ralphy-validate` | 인수 기준 검증 |
| `/ralphy-archive` | 완료 및 아카이브 |

### Claude Code

| 명령 | 기능 |
|------|------|
| `/ralphy-plan` | 요구사항에서 스펙 생성 |
| `/ralphy-implement` | 반복 루프로 빌드 |
| `/ralphy-validate` | 인수 기준 검증 |
| `/ralphy-archive` | 완료 및 아카이브 |

### OpenCode

AGENTS.md와 함께 자연어 사용:
- `"Follow AGENTS.md to plan [기능]"`
- `"Follow AGENTS.md to implement [변경]"`
- `"Follow AGENTS.md to validate"`
- `"Follow AGENTS.md to archive [변경]"`

**Ralph Loop 러너와 함께:**
```bash
npm install -g @th0rgal/ralph-wiggum
ralph "Follow AGENTS.md to implement add-api. Output <promise>TASK_COMPLETE</promise> when done." --max-iterations 20
```

## 워크플로우 예시

```bash
# 1. 계획: 아이디어에서 스펙 생성
You: /ralphy-plan JWT 사용자 인증 추가

# 2. 구현: AI가 반복적으로 빌드
You: /ralphy-implement add-user-auth

# 3. 검증: 테스트 통과 확인
You: /ralphy-validate

# 4. 아카이브: 변경 완료
You: /ralphy-archive add-user-auth
```

## 생성되는 파일

```
.cursor/prompts/          # 또는 .claude/commands/
├── ralphy-plan.md
├── ralphy-implement.md
├── ralphy-validate.md
└── ralphy-archive.md

AGENTS.md                 # OpenCode용

openspec/
├── specs/                # 진실의 원천
├── changes/              # 진행 중인 작업
├── archive/              # 완료됨
└── project.md            # 컨텍스트

ralphy-spec/              # 로컬 상태 + 아티팩트(IDE 친화적)
├── state.db              # SQLite 실행/태스크 로그
├── STATUS.md             # 라이브 상태(`ralphy-spec status`가 우선 사용)
├── TASKS.md              # 태스크 보드
├── BUDGET.md             # 비용/예산
├── runs/                 # 불변 실행 로그(`runs/<runId>.md`)
├── logs/                 # 백엔드 원본 출력(가능한 경우)
├── worktrees/            # Git worktree(worktree 모드 사용 시)
└── tasks/                # 태스크별 아티팩트(CONTEXT / REPAIR / NOTES)
    └── <taskId>/
        ├── CONTEXT.md
        ├── REPAIR.md
        └── NOTES.md
```

> 참고: 기존 `.ralphy/` 폴더가 있으면 자동으로 `ralphy-spec/`로 마이그레이션됩니다.

## 작동 방식

**Ralph Wiggum Loop:** AI가 작업 완료까지 동일한 프롬프트를 반복적으로 받습니다. 각 반복에서 파일의 이전 작업을 보고 자기 수정합니다.

**OpenSpec:** 코드 전에 스펙. 구조화된 스펙과 인수 기준으로 AI가 무엇을 빌드해야 하는지 정확히 알 수 있습니다.

**결합하는 이유:**

| 문제 | 해결책 |
|------|--------|
| 채팅의 모호한 요구사항 | 스펙이 의도를 고정 |
| AI가 중간에 멈춤 | 완료될 때까지 루프 재시도 |
| 검증 방법 없음 | 테스트가 출력 검증 |
| 도구별 설정 | 하나의 명령으로 모두 해결 |

## 설치 옵션

```bash
# npx (권장)
npx ralphy-spec init

# 전역 설치
npm install -g ralphy-spec
ralphy-spec init

# 특정 도구 지정
ralphy-spec init --tools cursor,claude-code,opencode
```

## 감사의 말

다음 프로젝트를 기반으로 합니다:

- **[Ralph 방법론](https://ghuntley.com/ralph)** by Geoffrey Huntley
- **[opencode-ralph-wiggum](https://github.com/Th0rgal/opencode-ralph-wiggum)** by @Th0rgal  
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** by Fission-AI

## 라이선스

BSD-3-Clause
