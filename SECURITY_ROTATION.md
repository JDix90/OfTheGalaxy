# Security: Credential Rotation Runbook

The project archive (`of-the-galaxy-rpg-consultant-handoff.zip` and the shared
`of-the-galaxy-rpg-foundation_*.zip`) shipped with **live secrets** inside
`backend/.env` and `backend/.env.example`. Anyone who received those archives has
those secrets. They must all be rotated. This file tracks what was done
automatically and what **you** must still do manually.

## Status

| Secret | Exposure | Automated action taken | Manual action required |
|---|---|---|---|
| `JWT_SECRET` | In `backend/.env` + `.env.example` | ✅ Rotated to a fresh 48-byte random value in `backend/.env`; placeholder in `.env.example` | None — but note all existing login tokens are now invalid; users must re-login. |
| `OPENAI_API_KEY` | In `backend/.env` + `.env.example` | ✅ Removed from both files | **REVOKE the old key** at https://platform.openai.com/api-keys, create a new one, paste it into `backend/.env`. Check usage/billing for unexpected spend. |
| `DB_PASSWORD` | In `backend/.env` + `.env.example` | ✅ Placeholder in `.env.example`; flagged in `.env` | **Change the Postgres role password** (below), then update `backend/.env`. |

> The OpenAI key and DB password cannot be rotated from code — they live in
> external systems (OpenAI dashboard, PostgreSQL). The steps below are yours to run.

## 1. Rotate the OpenAI key
1. Go to https://platform.openai.com/api-keys → revoke the previously-exposed key (the one that was committed in `.env`).
2. Create a new secret key.
3. Put it in `backend/.env` as `OPENAI_API_KEY=sk-...` (this file is git-ignored).
4. Review usage at https://platform.openai.com/usage for anomalies while the key was public.

## 2. Rotate the database password
```bash
psql -U postgres -c "ALTER USER jefe WITH PASSWORD 'a-new-strong-password';"
```
Then set `DB_PASSWORD=a-new-strong-password` in `backend/.env`.

## 3. Enable the pre-commit secret guard
This repo ships a scanner that blocks commits containing secrets or `.env` files.

```bash
# once the project is a git repo:
git config core.hooksPath .githooks
```
- Hook: `.githooks/pre-commit` → runs `scripts/check-secrets.sh` on staged files.
- Manual full scan any time: `scripts/check-secrets.sh --all`
- Bypass for a single commit (discouraged): `git commit --no-verify`

## 4. Before importing into git
The two `*.zip` bundles at the repo root embed copies of the old `.env`. They are
now git-ignored (`*.zip`), but **delete or move them out of the repo** before the
first commit so they can never enter history:
```bash
rm of-the-galaxy-rpg-consultant-handoff.zip zimkEb7A   # or move them elsewhere
```
If this code already lives in a git history somewhere with the old `.env`
committed, scrub it with `git filter-repo --path backend/.env --invert-paths`
(or BFG) and force-push, then rotate again to be safe.
