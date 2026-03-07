#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";

const DEFAULT_BRANCH = "spike/xero-lab";
const DEFAULT_WORKTREE_DIR = "../acctreconagents-xero-lab";

function runGit(args, options = {}) {
  try {
    return execFileSync("git", args, {
      stdio: options.stdio ?? "pipe",
      encoding: "utf8",
      cwd: options.cwd ?? process.cwd(),
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    const message =
      error && typeof error === "object" && "stderr" in error && error.stderr
        ? String(error.stderr).trim()
        : `git ${args.join(" ")} failed`;
    throw new Error(message);
  }
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/spike-worktree.mjs setup [--branch <name>] [--path <dir>] [--base <branch>]",
      "  node scripts/spike-worktree.mjs status [--branch <name>] [--path <dir>]",
      "  node scripts/spike-worktree.mjs teardown [--branch <name>] [--path <dir>] [--delete-branch] [--force]",
      "",
      "Defaults:",
      `  branch: ${DEFAULT_BRANCH}`,
      `  path:   ${DEFAULT_WORKTREE_DIR}`,
    ].join("\n")
  );
}

function parseArgs(argv) {
  const parsed = {
    command: argv[0] ?? "help",
    branch: DEFAULT_BRANCH,
    path: DEFAULT_WORKTREE_DIR,
    base: null,
    deleteBranch: false,
    force: false,
  };

  if (parsed.command === "--help" || parsed.command === "-h") {
    parsed.command = "help";
  }

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--branch") {
      parsed.branch = argv[i + 1] ?? parsed.branch;
      i += 1;
      continue;
    }
    if (arg === "--path") {
      parsed.path = argv[i + 1] ?? parsed.path;
      i += 1;
      continue;
    }
    if (arg === "--base") {
      parsed.base = argv[i + 1] ?? parsed.base;
      i += 1;
      continue;
    }
    if (arg === "--delete-branch") {
      parsed.deleteBranch = true;
      continue;
    }
    if (arg === "--force") {
      parsed.force = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.command = "help";
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function branchExists(branchName, repoRoot) {
  const result = runGit(["show-ref", "--verify", `refs/heads/${branchName}`], {
    cwd: repoRoot,
    allowFailure: true,
  });
  return result !== null;
}

function getDefaultBaseBranch(repoRoot) {
  if (branchExists("main", repoRoot)) return "main";
  if (branchExists("master", repoRoot)) return "master";
  const head = runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoRoot });
  return head || "main";
}

function getWorktrees(repoRoot) {
  const output = runGit(["worktree", "list", "--porcelain"], { cwd: repoRoot });
  const lines = output.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (const line of lines) {
    if (!line) {
      if (current) {
        entries.push(current);
        current = null;
      }
      continue;
    }

    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = {
        worktree: line.slice("worktree ".length),
        branch: null,
      };
      continue;
    }

    if (!current) continue;
    if (line.startsWith("branch ")) {
      current.branch = line.slice("branch refs/heads/".length);
    }
  }

  if (current) entries.push(current);
  return entries;
}

function setupWorktree(config, repoRoot) {
  const targetPath = path.resolve(repoRoot, config.path);
  const exists = branchExists(config.branch, repoRoot);
  const worktrees = getWorktrees(repoRoot);
  const alreadyRegistered = worktrees.find(
    (entry) =>
      path.resolve(entry.worktree) === targetPath || entry.branch === config.branch
  );

  if (alreadyRegistered) {
    console.log("Spike worktree already exists.");
    console.log(`Branch: ${alreadyRegistered.branch ?? "(detached)"}`);
    console.log(`Path:   ${alreadyRegistered.worktree}`);
    return;
  }

  if (exists) {
    runGit(["worktree", "add", targetPath, config.branch], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } else {
    const base = config.base ?? getDefaultBaseBranch(repoRoot);
    runGit(["worktree", "add", "-b", config.branch, targetPath, base], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }

  console.log("");
  console.log("Spike worktree is ready.");
  console.log(`Branch: ${config.branch}`);
  console.log(`Path:   ${targetPath}`);
  console.log("");
  console.log("Next:");
  console.log(`  cd "${targetPath}"`);
  console.log("  # add local-only env flags in apps/web/.env.local");
  console.log("  # commit experiments to spike branch only");
}

function teardownWorktree(config, repoRoot) {
  const targetPath = path.resolve(repoRoot, config.path);
  const args = ["worktree", "remove", targetPath];
  if (config.force) args.push("--force");

  const removed = runGit(args, { cwd: repoRoot, allowFailure: true });
  if (removed === null) {
    console.log(`No removable worktree found at: ${targetPath}`);
  } else {
    console.log(`Removed worktree: ${targetPath}`);
  }

  if (config.deleteBranch) {
    if (branchExists(config.branch, repoRoot)) {
      runGit(["branch", "-D", config.branch], { cwd: repoRoot, stdio: "inherit" });
      console.log(`Deleted branch: ${config.branch}`);
    } else {
      console.log(`Branch not found: ${config.branch}`);
    }
  }
}

function printStatus(config, repoRoot) {
  const targetPath = path.resolve(repoRoot, config.path);
  const worktrees = getWorktrees(repoRoot);
  const branchRegistered = worktrees.find((entry) => entry.branch === config.branch);
  const pathRegistered = worktrees.find(
    (entry) => path.resolve(entry.worktree) === targetPath
  );

  console.log(`Branch exists: ${branchExists(config.branch, repoRoot) ? "yes" : "no"}`);
  console.log(`Target path:  ${targetPath}`);
  console.log(`Path linked:  ${pathRegistered ? "yes" : "no"}`);
  console.log(`Branch linked:${branchRegistered ? " yes" : " no"}`);

  if (pathRegistered) {
    console.log(`Worktree path registration: ${pathRegistered.worktree}`);
  }
  if (branchRegistered) {
    console.log(`Worktree branch registration: ${branchRegistered.worktree}`);
  }
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.command === "help") {
    printUsage();
    process.exit(0);
  }

  const repoRoot = runGit(["rev-parse", "--show-toplevel"]);
  const command = config.command.toLowerCase();

  if (command === "setup") {
    setupWorktree(config, repoRoot);
    return;
  }
  if (command === "teardown") {
    teardownWorktree(config, repoRoot);
    return;
  }
  if (command === "status") {
    printStatus(config, repoRoot);
    return;
  }

  throw new Error(`Unknown command: ${config.command}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
