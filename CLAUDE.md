# ClinicFlow — Claude Development Rules

## Git Safety Rules

| Rule | Details |
|------|---------|
| Never run git write commands without asking | Applies to: add, commit, push, checkout, switch, branch, merge, rebase, reset, stash, cherry-pick, tag, restore |
| Before any git write command | 1. State the exact command, 2. State which branch, 3. Wait for confirmation |
| Read-only git commands | Allowed freely: status, log, diff, branch --show-current, remote -v |
| Never assume branch | Always confirm which branch before commit/push |
| Never stage files silently | Must list files and get approval first |

---

## Global Development Rules

| # | Rule | Summary |
|---|------|---------|
| 1 | File Size | No file >600 lines; split at 500 into utils/services; stop writing at 2000 lines |
| 2 | Folder Structure | routes/ = thin HTTP only; services/ = business logic; lib/ = singletons; utils/ = helpers |
| 3 | Code Style | Functional patterns, no nesting >3 levels, business logic never in routes/workers |
| 4 | Refactoring | Single-purpose functions; route handlers: validate → service → return |
| 5 | Documentation | One-line purpose comment at top of every file; typed inputs/outputs for all exports |
| 6 | Always Ask Before | New top-level folders, architecture decisions, refactors touching >3 files |
| 7 | Git Commits | NEVER commit unless explicitly asked — always wait for "commit" instruction |
| 8 | Postman Collection | Update DriveEV-API.postman_collection.json for every new endpoint |
| 9 | PR Review | Run /simplify, fix issues, smoke-test via curl before raising PR |

---

## Memory Rules

| Source | Rule |
|--------|------|
| feedback_never_kill_node.md | NEVER run `taskkill /F /IM node.exe` — kills all running Node apps |
| server process | Use `npx kill-port <port>` to stop the dev server, never kill all node processes |
