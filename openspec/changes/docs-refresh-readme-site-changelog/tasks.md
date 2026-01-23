# Tasks: docs-refresh-readme-site-changelog

> Goal: Make GitHub + npm + GitHub Pages show the latest, consistent docs (multi-language), and add a website-visible changelog.

## Checklist

1. [x] Add repo-level `CHANGELOG.md` (single source of truth)
   - Implementation notes:
     - Create `CHANGELOG.md` at repo root.
     - Include an entry for the current `package.json` version.
     - Define a lightweight format (Keep a Changelog style is fine) to support future releases.
   - Test plan:
     - `test -f CHANGELOG.md`
     - `node -e "const p=require('./package.json'); const fs=require('fs'); const s=fs.readFileSync('CHANGELOG.md','utf8'); if(!s.includes(p.version)) process.exit(1)"`

2. [x] Ensure npm tarball includes READMEs + changelog
   - Implementation notes:
     - Update root `package.json` `"files"` to include `CHANGELOG.md`.
   - Test plan:
     - `npm pack --dry-run` and confirm it lists:
       - `README.md`, `README.zh.md`, `README.ko.md`, `README.ja.md`
       - `CHANGELOG.md`

3. [x] Refresh `README.md` + localized READMEs to reflect the latest docs
   - Implementation notes:
     - Align command names to:
       - `/ralphy-plan`, `/ralphy-implement`, `/ralphy-validate`, `/ralphy-archive`
     - Add/verify links:
       - Website (`https://ralphy-spec.org`)
       - Documentation section on the website
       - Changelog (repo and/or website route)
     - Keep language switcher links at the top consistent across all READMEs.
   - Test plan:
     - `rg "/ralphy:" README*.md` returns no matches
     - Spot-check that links resolve (no bare URLs required in docs content, but links must be correct)

4. [x] Update website docs content to match README (commands + examples)
   - Implementation notes:
     - Replace all `/ralphy:*` references with `/ralphy-*` across:
       - `docs/src/components/ToolTabs.astro`
       - `docs/src/pages/[lang]/docs/index.astro`
       - `docs/src/pages/[lang]/docs/cursor.astro`
       - `docs/src/pages/[lang]/docs/claude.astro`
     - Ensure examples and “workflow” language match the README.
   - Test plan:
     - `rg "/ralphy:" docs/src` returns no matches

5. [x] Add a website Changelog page (per locale) rendered from the repo `CHANGELOG.md`
   - Implementation notes:
     - Create `docs/src/pages/[lang]/changelog.astro`.
     - At build time, read `CHANGELOG.md` and render it as preformatted/markdown content.
     - Add navigation entry to the changelog page.
     - Add i18n keys for changelog labels/titles in:
       - `docs/src/i18n/translations/en.json`
       - `docs/src/i18n/translations/zh.json`
       - `docs/src/i18n/translations/ko.json`
       - `docs/src/i18n/translations/ja.json`
   - Test plan:
     - `npm --prefix docs ci`
     - `npm --prefix docs run build`
     - Confirm output files exist:
       - `docs/dist/en/changelog/index.html`
       - `docs/dist/zh/changelog/index.html`
       - `docs/dist/ko/changelog/index.html`
       - `docs/dist/ja/changelog/index.html`

6. [x] Ensure website navigation exposes Docs + Changelog clearly
   - Implementation notes:
     - Update `docs/src/components/Nav.astro` to include in-site links:
       - Docs landing: `/${lang}/docs/`
       - Changelog: `/${lang}/changelog`
     - Keep external links (GitHub, npm) available.
   - Test plan:
     - `npm --prefix docs run build` succeeds
     - Manually open `docs/dist/en/index.html` and verify nav contains links to Docs and Changelog

7. [x] Improve root entry experience (default English, remember last language)
   - Implementation notes:
     - Remove the visible redirect UX at `docs/src/pages/index.astro` by avoiding meta-refresh.
     - Implement “first visit → /en/; returning visit → last selected locale” using a stable localStorage key (e.g. `ralphy_lang`).
     - Update `docs/src/components/LanguagePicker.astro` to persist locale selection to the same localStorage key.
   - Test plan:
     - `rg "http-equiv=\"refresh\"" docs/src/pages/index.astro` returns no matches
     - `rg "localStorage" docs/src/pages/index.astro docs/src/components/LanguagePicker.astro` returns matches

8. [x] Add Google Analytics (gtag) to `ralphy-spec.org`
   - Implementation notes:
     - Add the provided gtag snippet to the site head (likely `docs/src/layouts/Layout.astro`) so it is present on all pages.
     - Use measurement ID `G-2P74S4Q2SX`.
   - Test plan:
     - `npm --prefix docs ci && npm --prefix docs run build`
     - `rg "G-2P74S4Q2SX" docs/dist` returns at least one match

9. [x] Validate the full publishing surfaces (local deterministic checks)
   - Implementation notes:
     - Focus on deterministic build + grep checks (no release required).
   - Test plan:
     - Root package: `npm ci && npm run build && npm run typecheck`
     - Docs site: `npm --prefix docs ci && npm --prefix docs run build`
     - Consistency checks:
       - `rg "/ralphy:" README*.md docs/src` returns no matches
       - `npm pack --dry-run` includes required files

