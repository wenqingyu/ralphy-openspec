---
domain: docs
change: docs-refresh-readme-site-changelog
---

## ADDED Requirements

### Requirement: Public documentation MUST be consistent across README and website

The project MUST present the same command names and workflow guidance on:
- GitHub README (`README.md` and localized READMEs)
- The published website (`docs/` Astro site)

#### Scenario: No legacy slash command syntax remains in documentation sources

Given the repository workspace
When searching documentation sources
Then there MUST be zero matches for the legacy command prefix `/ralphy:` in:
- `README*.md`
- `docs/src/**`

Acceptance criteria (deterministic):
- `rg "/ralphy:" README*.md` returns no matches
- `rg "/ralphy:" docs/src` returns no matches

#### Scenario: Command names match the canonical workflow phases

Given the canonical workflow phases PLAN → IMPLEMENT → VALIDATE → ARCHIVE
When documentation displays workflow commands
Then it MUST use exactly:
- `/ralphy-plan`
- `/ralphy-implement`
- `/ralphy-validate`
- `/ralphy-archive`

### Requirement: README pages MUST provide latest links for GitHub and npm

The main README and localized READMEs MUST include:
- A website link to the docs site (`https://ralphy-spec.org`)
- A link to the website documentation section
- A link to the changelog (repo and/or website)

#### Scenario: npm package contains the READMEs required for multi-language landing

Given `package.json` lists published files
When packing the package
Then the tarball MUST include the four README files:
- `README.md`
- `README.zh.md`
- `README.ko.md`
- `README.ja.md`

Acceptance criteria (deterministic):
- `npm pack --dry-run` output includes the four README files

### Requirement: Website MUST expose a Changelog page for each locale

The website MUST have a dedicated changelog page per locale.

#### Scenario: All locales build a changelog route

Given locales `en`, `zh`, `ko`, `ja`
When building the Astro site
Then each locale MUST have a generated changelog page route.

Acceptance criteria (deterministic):
- `npm --prefix docs ci`
- `npm --prefix docs run build`
- After build, these files exist:
  - `docs/dist/en/changelog/index.html`
  - `docs/dist/zh/changelog/index.html`
  - `docs/dist/ko/changelog/index.html`
  - `docs/dist/ja/changelog/index.html`

### Requirement: Changelog MUST be maintainable as a single source of truth

There MUST be a repository-level changelog file that can be updated per release.

#### Scenario: Repository contains a versioned changelog

Given the repository root
When browsing documentation files
Then `CHANGELOG.md` MUST exist and include at least one entry for the current package version.

Acceptance criteria (deterministic):
- `test -f CHANGELOG.md`
- `node -e "const p=require('./package.json'); const fs=require('fs'); const s=fs.readFileSync('CHANGELOG.md','utf8'); if(!s.includes(p.version)) process.exit(1)"`

### Requirement: Website root path MUST land users on a locale without an obvious redirect page

The website root path (`/`) MUST immediately route users to a locale page.

#### Scenario: First-time visitor defaults to English

Given a visitor without a stored language preference
When they visit `/`
Then they MUST be routed to `/en/` as the default locale.

Acceptance criteria (deterministic proxy checks):
- `docs/src/pages/index.astro` MUST NOT use `http-equiv="refresh"` (no meta-refresh redirect page).
- `docs/src/pages/index.astro` MUST contain a script that routes to `/en/` when no preference is present.

#### Scenario: Returning visitor lands on previously selected language

Given a visitor with a stored language preference value in local storage
When they visit `/`
Then they MUST be routed to `/<preferred-lang>/`.

Acceptance criteria (deterministic proxy checks):
- `docs/src/pages/index.astro` MUST read a stable localStorage key (e.g. `ralphy_lang`) and route to the stored locale when it is one of `en|zh|ko|ja`.
- `docs/src/components/LanguagePicker.astro` MUST write the same localStorage key when a language is selected.

### Requirement: Website MUST include Google Analytics (gtag) site-wide

The website MUST include the provided GA tag for measurement ID `G-2P74S4Q2SX` on all pages.

#### Scenario: GA tag exists in the built site output

Given the docs site is built
When scanning the build output
Then the GA measurement ID MUST be present in the generated HTML.

Acceptance criteria (deterministic):
- `npm --prefix docs ci`
- `npm --prefix docs run build`
- `rg "G-2P74S4Q2SX" docs/dist` returns at least one match

