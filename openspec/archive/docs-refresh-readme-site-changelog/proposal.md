---
change: docs-refresh-readme-site-changelog
title: Refresh README + website docs, add changelog page
status: proposed
---

## Summary

This change refreshes the public documentation surface for **GitHub**, **npm**, and the **GitHub Pages website**:

- Update root `README.md` and localized READMEs (`README.zh.md`, `README.ko.md`, `README.ja.md`) so GitHub + npm show the latest, consistent guidance.
- Update the Astro website (`docs/`) so the published site content matches the latest docs and command names.
- Add a changelog that is visible on the website (with i18n-aware chrome) to show past versions and changes.

## Why

Today the documentation is inconsistent across surfaces. For example, the website pages and the home tabs show slash commands like `/ralphy:plan`, while the repository READMEs use `/ralphy-plan`. This causes confusion and makes it hard to trust the docs as the canonical reference.

## Goals

- Make GitHub and npm landing pages show the most up-to-date onboarding and links.
- Make the GitHub Pages site reflect the same “source of truth” docs as README.
- Provide a website-accessible changelog that lists versions and human-readable changes.
- Keep multi-language support (en/zh/ko/ja) consistent across README and website navigation.
- Improve the website root entry experience: first-time users land on English; returning users land on their previously selected language.
- Add Google Analytics to `ralphy-spec.org` for traffic insights.

## Non-goals

- Introducing a new i18n framework or migrating to content collections.
- Building a fully automated release process (semantic-release, GitHub Releases automation, etc.).
- Rewriting core CLI behavior; this change is documentation-focused.

## Scope

### In scope

- README refresh across four languages:
  - Ensure command names match the actual tool prompts (`/ralphy-plan`, `/ralphy-implement`, `/ralphy-validate`, `/ralphy-archive`).
  - Ensure links to website docs and changelog are present and correct.
  - Ensure “What gets created” folder structure is accurate for current behavior.
- Website refresh:
  - Fix command names and examples on website pages and home tabs.
  - Add a navigation entry for Documentation and Changelog.
  - Add a Changelog page under all locales (e.g. `/en/changelog`, `/zh/changelog`, ...).
  - Optimize the root path (`/`) behavior to avoid an obvious redirect page and to remember the last selected language.
  - Add Google Analytics (gtag) site-wide.
- Changelog:
  - Add `CHANGELOG.md` at repo root (human-readable, versioned).
  - Ensure the website Changelog page renders from a single maintained source.

### Out of scope

- Localization of every changelog entry body (allowed as a follow-up).
- API reference generation.

## Assumptions / Constraints

- The project is published to npm as `ralphy-spec`, and npm will display `README.md` by default.
- The website is built from `docs/` and deployed via GitHub Actions workflow `deploy-docs.yml`.
- Current repo state does not include `openspec/specs/` in the root tree; existing specs live under `openspec/archive/` and active change folders under `openspec/changes/`. This change does not attempt to restructure specs; it focuses on documentation surfaces.

## Risks

- Documentation drift can reoccur if README, templates, and website content are edited independently.
- i18n key changes require updating all translation JSON files.

## Success Criteria (high-level)

- A user can follow the README and website without encountering mismatched command names.
- The website includes a discoverable Changelog page that lists at least the current version and future entries can be added easily.

