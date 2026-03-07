# Xero Lab Workflow

This workflow lets you test new Xero features in an isolated branch and worktree, without impacting your main repo folder.

## Why this exists
- Keeps experimental commits away from your main branch.
- Lets you run risky tests safely.
- Makes cleanup one command.

## Quick commands
From repo root:

```bash
npm run spike:xero:setup
npm run spike:xero:status
npm run spike:xero:teardown
```

Defaults:
- Branch: `spike/xero-lab`
- Worktree path: `../acctreconagents-xero-lab`

## What setup does
- Creates the branch `spike/xero-lab` if missing.
- Creates a git worktree at `../acctreconagents-xero-lab`.
- Leaves your current repo working directory unchanged.

## Typical usage
1. Run setup:
   ```bash
   npm run spike:xero:setup
   ```
2. Open the worktree:
   ```bash
   cd ../acctreconagents-xero-lab
   ```
3. Add local test flags in `apps/web/.env.local`, for example:
   ```bash
   XERO_DEV_NO_DB=true
   ```
4. Commit only on `spike/xero-lab`.
5. Tear down when finished:
   ```bash
   cd ../acctreconagents
   npm run spike:xero:teardown
   ```

## Advanced options
Use the underlying script directly:

```bash
node scripts/spike-worktree.mjs setup --base develop
node scripts/spike-worktree.mjs setup --path ..\acctreconagents-xero-sandbox
node scripts/spike-worktree.mjs teardown --force
node scripts/spike-worktree.mjs teardown --delete-branch
node scripts/spike-worktree.mjs status
```

## Safety notes
- `teardown` without `--force` will not remove a dirty worktree.
- `--delete-branch` permanently deletes the local spike branch.
- Keep test credentials in local env files only.
