# Codex-only upstream maintenance

Schedule: daily at 09:00, `America/Edmonton`, one fresh Orca worktree per run. Provider: **codex** only, using Joel’s configured Astra model. Never substitute Claude or another provider. Never use MCP or create upstream PRs.

A scheduled run prepares and tests a merge for review. Automatic pushes are off. Relaunching the app is a manual step, because it owns live sessions.

## Automation prompt

Maintain Joel’s personal Orca fork. Use Codex only. Read AGENTS.md, README.joel.md, and this maintenance contract before acting. Work only in the fresh automation worktree; never switch, reset, clean, or stash a user’s checkout.

1. Inspect `git status`, branch, and remote URLs. Stop on unexpected dirt or ownership. Resolve the upstream remote by the exact repository `stablyai/orca`, and the fork by `joelthecoder/orca`; do not assume their names. Refuse every external write to upstream.
2. Fetch only upstream `main` and fork `joelthecoder/joel-inter-agent-messaging`. Use the freshly fetched fork branch as the candidate base. If the latest upstream main is already an ancestor, report that no update is needed and finish without a model retry or new worktree.
3. Merge upstream main into the candidate, preserving personal commits. Do not rebase or force-push published history. Resolve only conflicts whose intended behavior is clear from the personal README and tests. Otherwise leave the isolated candidate for review and report the conflicting paths.
4. Review upstream changes affecting the sidebar, drag behavior, agent identities, startup, and the dev updater guard. Update the personal implementation and documentation together where required. Never modify upstream workflows merely to hide failures.
5. Run the checks in README.joel.md and any additional checks required by changed upstream code. Keep all app launches and tests hidden with `ORCA_BACKGROUND_LAUNCH=1`. Follow the installed pre-push review skill before any publication. Use LSP diagnostics and references for code inspection. Do not claim success from typechecks alone.
6. Update README.joel.md with material personal changes and regenerate screenshots from synthetic fixtures when the visible behavior changed. Keep user data and generated build output out of commits.
7. Default policy: stop with the tested candidate commit, upstream SHA, fork base SHA, checks, and conflicts (if any). Do not publish, create PRs, install an app, or relaunch anything.
8. If Joel explicitly enables automatic fork publication for this automation, re-fetch the fork branch and verify it has not moved from the candidate’s base. If it moved, leave the candidate for review; do not overwrite concurrent work. Otherwise use a normal fast-forward push to `refs/heads/joelthecoder/joel-inter-agent-messaging` on the verified personal fork only. Never force-push. Leave the running app untouched.

## Orca setup

Use `orca automations create --provider codex --workspace-mode new-per-run --repo <this-repo> --base-branch fork/joelthecoder/joel-inter-agent-messaging --trigger daily --time 09:00 --timezone America/Edmonton --enabled` with the prompt above supplied via the CLI’s prompt argument. Use the remote name actually present in that checkout.

The current CLI does not expose a per-automation model flag. Verify the configured Codex launcher selects Astra before enabling the schedule. This document does not grant an unattended write allowlist or change existing automation restrictions.
