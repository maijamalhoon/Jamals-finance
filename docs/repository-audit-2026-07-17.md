# Repository Audit — 2026-07-17

Repository: `maijamalhoon/Jamals-finance`  
Default branch: `main`  
Visibility: Public  
Audit scope: repository layout, governance, documentation, configuration, dependency hygiene, secret exposure indicators, pull request history, branch cleanup risk, and non-destructive public-repository readiness.

## Executive summary

The repository already has a strong application structure and a substantial public-maintenance layer. The current codebase is organized around Next.js App Router, TypeScript, Supabase, versioned database migrations, shared components, focused utilities, tests, CI, and Vercel deployment.

The audit found that most requested public-repository files were already present and recently improved. The remaining high-confidence gaps were legal clarity, explicit governance rules, automated dependency update configuration, and a durable audit record. Those gaps are addressed by the audit pull request without changing application code, UI, database behavior, or deployment runtime.

No branch was deleted, no force push was performed, no history was rewritten, and no application file was removed.

## Existing strengths verified

- Professional visual `README.md` with project purpose, capabilities, architecture, technology, structure, setup, commands, security, contribution, deployment, and licensing status.
- `.env.example` contains placeholders only and separates public values from server secrets.
- `.gitignore` excludes dependencies, Next.js output, coverage, local build verification output, environment files, Vercel state, logs, temporary files, credentials, editor files, and local design references.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` are present.
- Pull request template, issue forms, `CODEOWNERS`, `.editorconfig`, and `.gitattributes` are present.
- GitHub Actions CI runs install, lint, TypeScript validation, the Vitest suite, and a production build.
- `package.json` exposes clear scripts for development, build, lint, typecheck, tests, and combined checks.
- Supabase changes are stored as versioned migrations.
- The latest `main` commit had a successful Vercel status at audit time.

## Problems and risks found

### 1. Missing top-level license file

The repository is public, while `package.json` uses `UNLICENSED` and the README states that no open-source license is granted. That position is valid, but there was no top-level `LICENSE` file to make the source-available/all-rights-reserved terms visible in the standard repository location.

**Action:** Added a top-level `LICENSE` notice that preserves the existing no-open-source-license position. No third-party or open-source license was selected on the owner's behalf.

### 2. Governance rules were distributed but incomplete

`CONTRIBUTING.md` already covered setup, branch prefixes, commit style, validation, data integrity, UI expectations, migrations, and pull requests. It did not fully define approval requirements, merge-method selection, remote branch deletion, obsolete pull request handling, or strict conditions for history rewrites.

**Action:** Added `GOVERNANCE.md` with protected-mainline rules, branch naming, commit format, PR creation, review and approval, required validation, squash-first merge strategy, branch deletion policy, history safety, dependency policy, security handling, and repository hygiene.

### 3. Dependency updates were manual

No Dependabot configuration was present.

**Action:** Added `.github/dependabot.yml` for weekly npm checks and monthly GitHub Actions checks with controlled pull request limits and conventional commit prefixes.

### 4. Latest merged pull request quality did not meet the repository's own template

Pull request #21 was merged with the title `modifications`, an empty template, unchecked validation boxes, and a squash commit named `modifications (#21)`. The diff contained broad application changes, so the title and PR description do not provide a useful historical explanation.

**Action:** History was not rewritten because the commit is already on shared `main`. `GOVERNANCE.md` now explicitly rejects vague messages such as `modifications` and requires material completion of the PR template before merge.

### 5. Historical direct-to-main workflow exists

Pull request #1 records that the same commit was pushed directly to `main`, then the draft PR was closed. Direct mainline pushes reduce review evidence and make branch cleanup harder.

**Action:** `GOVERNANCE.md` now defines `main` as a protected production branch and requires scoped branches and pull requests, including emergency fixes whenever GitHub is available.

### 6. Potential unused dependency

Repository code search found `@anthropic-ai/sdk` in package metadata but did not find a source import or usage. The AI route currently documents and references Gemini configuration.

**Action:** The dependency was not removed in this audit because dependency removal requires a complete repository usage search, lockfile regeneration, tests, and a production build in an environment with dependency installation access. Open a focused `chore/deps` pull request after verification.

### 7. Secret scanning limitations

The committed `.env.example` contains empty placeholders, and the audit did not find exposed key values through focused code searches. This does not prove that no secret ever existed in the complete Git history.

**Action:** No history rewrite was attempted. Enable GitHub secret scanning and push protection, review provider dashboards, and rotate any credential immediately if an exposure is detected.

## Branch and merge review

The pull request history shows that useful feature, integrity, authentication, UI, documentation, and repository-maintenance work has already been merged into `main` through pull requests. No additional old feature branch was merged during this audit because doing so would risk duplicating squash-merged changes.

The following closed pull request heads are branch-deletion candidates after confirming that each remote ref still exists and contains no unique unmerged commit:

| Branch candidate | Related PR | Status/reason |
| --- | ---: | --- |
| `agent/full-ui-ux-review` | #21 | Merged into `main`; candidate after production verification |
| `agent/atlas-visual-redesign` | #20 | Merged; branch diverges because of squash history and later mainline commits |
| `agent/fix-mobile-finance-modals` | #19 | Merged |
| `agent/complete-website-requirements` | #18 | Merged |
| `agent/theme-forms-integration` | #16 | Merged |
| `node-6-theme-mobile-critical-cleanup` | #11 | Merged |
| `docs/readme-visual-refresh` | #9 | Closed unmerged; work was superseded/reconstructed by later repository-organization work |
| `node-1-analytics-data-integrity` | #4 | Merged |
| `revert-2-ui/premium-consistency-overhaul` | #3 | Revert merged |
| `codex/finance-payables-upgrade` | #1 | Closed after the same commit was pushed to `main` |

Before deleting any branch:

```bash
git fetch --all --prune
git log --oneline main..origin/<branch>
git diff --stat main...origin/<branch>
git branch -r --merged origin/main
```

Squash merges can leave a branch appearing ahead by commit identity even when its final content was integrated. Confirm the pull request, final tree, and any later edits rather than relying only on `--merged`.

The GitHub connector used for this audit did not expose a complete branch-list endpoint, so the repository owner should compare this candidate list with the GitHub **Branches** page or `git branch -r` before approving deletion. No branch deletion was performed.

## Commit history review

The repository has a mix of strong Conventional Commit-style messages and older broad or unclear messages.

Positive examples include:

- `fix: keep finance modals on mobile viewport`
- `feat(theme): unify responsive forms and semantic colors`
- `chore(repo): complete public repository organization`
- `fix(auth): harden Supabase session recovery`

History concerns include:

- `modifications (#21)` is too vague for a broad change.
- Earlier direct-to-main work reduced pull request traceability.
- Squash-merged branches remain as divergent refs even when their content was integrated.

No existing commit was amended, rebased, or removed. Rewriting 190 shared commits for cosmetic cleanup would create more risk than value. Future history should be improved through focused branches, completed PR descriptions, clear squash titles, and immediate deletion of verified merged branches.

## Pull request workflow

1. Update local `main` and create a focused branch using an approved prefix.
2. Make one coherent change and avoid unrelated formatting or generated artifacts.
3. Run relevant targeted tests, then `npm run check`, `npm run build`, and `git diff --check` for broad changes.
4. Push the branch and open a draft pull request early when collaboration is useful.
5. Complete the PR template with exact validation results, screenshots for visible changes, migration/environment notes, scope exclusions, risks, and manual verification.
6. Resolve conflicts and update the branch from `main` before final review.
7. Obtain maintainer approval and ensure required checks pass.
8. Squash merge by default using a clear Conventional Commit-style title.
9. Verify the Vercel deployment and affected production flow.
10. Delete the remote branch after confirming that no unique work remains.

## Future repository rules

- Keep `main` deployable and reviewed.
- Never commit `.env.local`, real credentials, private records, build output, logs, or temporary QA artifacts.
- Update `.env.example`, README, migrations, and deployment notes in the same PR as related behavior.
- Require owner-scoped data access and Row Level Security review for Supabase changes.
- Treat failed financial data as unavailable or partial, never as fabricated zero values.
- Keep dependencies minimal and remove them only after usage search, lockfile update, tests, and build verification.
- Use small pull requests and meaningful commit/PR titles.
- Delete verified merged branches promptly; retain long-lived branches only with a documented owner and purpose.
- Do not rewrite shared history for cosmetic reasons.
- Rotate leaked secrets before attempting Git-history cleanup.

## Validation and limitations

This audit's repository changes are documentation and GitHub configuration only. No files under `app/`, `components/`, `lib/`, `public/`, `supabase/`, or runtime configuration were changed.

The execution environment did not provide GitHub CLI access or outbound package installation, so a fresh local `npm ci`, test suite, and production build could not be run here. Existing merged pull requests document successful checks for prior application changes, and the latest `main` commit reported a successful Vercel status. The audit pull request should still be allowed to run the repository CI before merge.

## Remaining recommended improvements

- Enable branch protection/rulesets for `main` with required CI checks, required pull requests, and blocked force pushes.
- Enable automatic deletion of head branches after merge.
- Enable private vulnerability reporting, secret scanning, and push protection where available.
- Consider CodeQL scanning after confirming the desired alert ownership and workflow permissions.
- Verify and remove `@anthropic-ai/sdk` if it remains unused.
- Review all remote branches against the deletion-candidate process above and delete only after explicit approval.
- Replace the conceptual README hero with real redacted product screenshots when stable release visuals are available.
