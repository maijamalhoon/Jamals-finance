# Security Policy

Jamal's Finance handles authentication and personal finance data. Security reports should be handled privately and with enough detail to reproduce the issue safely.

## Supported version

Security fixes are applied to the latest production version and the current `main` branch. Older commits, abandoned branches, local forks, and unofficial deployments are not supported.

## Reporting a vulnerability

Do **not** open a public GitHub issue for a vulnerability that could expose:

- Authentication or session data
- Private financial records
- API keys, credentials, or environment values
- Row Level Security bypasses
- Account takeover paths
- Destructive actions without appropriate authorization
- Personally identifiable information

Use GitHub's private vulnerability reporting flow when it is available under the repository's **Security** tab. Otherwise, contact the repository owner privately through GitHub before sharing technical details.

Include:

1. A clear description of the issue
2. The affected route, component, API, or database policy
3. Reproduction steps using non-sensitive test data
4. Expected and observed behavior
5. Impact and likely attack conditions
6. Screenshots or logs with secrets and personal data removed
7. A suggested remediation, when known

Please do not test against accounts or data that you do not own. Do not use automated scanning that could degrade the production service.

## Handling expectations

Reports will be reviewed on a best-effort basis. Valid reports are prioritised according to impact, exploitability, and exposure. A fix may include code changes, configuration changes, credential rotation, database-policy updates, or temporary feature restriction.

Do not publicly disclose a confirmed vulnerability until the owner has had a reasonable opportunity to investigate and deploy a correction.

## Secrets

Real credentials must never be committed. If a credential is accidentally exposed:

1. Revoke or rotate it immediately
2. Remove it from the current source tree
3. Review logs and provider activity
4. Treat Git history cleanup as secondary to rotation; deleting a commit does not invalidate a leaked secret

## Security boundaries

The project currently relies on Supabase Auth, protected application routes, server-only environment variables, and Row Level Security for user-owned records. UI controls are not security boundaries. Client-side validation, hidden buttons, local-storage preferences, and visual confirmation states must never be treated as authorization.
