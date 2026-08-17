# Contributing

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope): ...` — a new capability (bumps the MINOR version)
- `fix(scope): ...` — a bug fix (bumps the PATCH version)
- `docs: ...` — documentation only (no release needed)
- `chore: ...`, `refactor: ...`, `test: ...` — upkeep (no release needed)

Scope examples: `telegram`, `web`, `cli`, `auth`, `docs`, `i18n`.

## Releases

A release is **a tag on `main`** — CI builds the worker tarball, publishes
`mailriz-cli-nxt` to npm, and attaches the tarball to a GitHub Release.

### When a release is needed

Only when the **Worker** changes — anything under `packages/app`
(handlers, routes, migrations, the dashboard bundle). The CLI downloads the
worker from `releases/latest`, so without a release users never see the
change. Documentation, README, CHANGELOG, or CLI-only changes do **not**
need a release (docs deploy to GitHub Pages on push).

### Versioning

Semver, driven by what the tag contains since the last tag:

| Change | Bump | Example |
|---|---|---|
| New feature | MINOR | `v1.5.0` → `v1.6.0` |
| Bug fix | PATCH | `v1.6.0` → `v1.6.1` |
| Breaking / structural | MAJOR | `v1.6.1` → `v2.0.0` |

Mixed feature + fix in one tag: bump MINOR. Batch multiple commits into one
tag when convenient — a tag per commit is not required.

### How to release

```bash
git push origin main
git tag v1.6.0
git push origin v1.6.0
```

Watch the release workflow:

```bash
gh run list --workflow=release.yml --limit 1
gh run watch <run-id>
```

Afterwards, update `CHANGELOG.md` with the new section.

## Local development

- `bun install` then `bun run dev:app` (wrangler) + `bun run dev:web` (vite)
- Typecheck: `bun run typecheck`
- Tests: `bun run test` (app, web, cli)
- Docs: `bun run docs:dev`

## Tests

Worker tests use in-memory D1/R2 fakes through the real handler/route
interfaces. CLI tests pin behaviour via the source (wizard prompts cannot be
driven interactively). Web tests cover routing and the i18n dictionary.
When adding a feature, extend the matching test file — every user-visible
string must live in `packages/app/web/src/lib/i18n.ts`, never inline.
