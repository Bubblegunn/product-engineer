Range v1.2.0..HEAD (15 commits incl. one merge). Net customer-visible: bulk export (feat -> reverted -> re-added under the title 'fix: typo in export header'; header is 'id,title'), tag filtering (merged from feature/tags, commits titled 'wip', 'wip 2'), and parse('') now throws TypeError (title 'refactor: split parser').
Not shipping: dark mode (reverted, src/theme.js absent) and SSO (feature/sso never merged). The CHANGELOG Unreleased draft wrongly lists both.
Internal and to be omitted: ci workflow, lint passes, version bump, README edit. node --test on main: 13 pass, 0 fail.
