#!/usr/bin/env node
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const preferredPorts = [3000, 3100, 3200];
const host = process.env.HOST ?? '0.0.0.0';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
const lockFile = path.resolve(__dirname, '../.next/dev/lock');

const tryBind = (port, bindHost) =>
  new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();
    tester.once('error', (error) => {
      resolve({ ok: false, code: error?.code });
    });
    tester.once('listening', () => {
      tester.close(() => resolve({ ok: true, code: null }));
    });
    tester.listen({ port, host: bindHost, exclusive: true });
  });

const isPortAvailable = async (port) => {
  const counterpartHost = host.includes(':') ? '0.0.0.0' : '::';
  const hostsToTest = Array.from(new Set([host, counterpartHost]));

  for (const bindHost of hostsToTest) {
    const result = await tryBind(port, bindHost);
    if (!result.ok) {
      if (result.code === 'EADDRNOTAVAIL') {
        continue;
      }
      return false;
    }
  }

  return true;
};

const findPort = async () => {
  const unavailable = [];
  for (const port of preferredPorts) {
    try {
      if (await isPortAvailable(port)) {
        return { port, unavailable };
      }
    } catch {
      // fall through to treat as unavailable
    }
    unavailable.push(port);
  }
  return { port: null, unavailable };
};

const { port: recommendedPort, unavailable } = await findPort();

if (!recommendedPort) {
  console.error(
    `[dev] Ports ${preferredPorts.join(
      ', '
    )} are unavailable. Stop the conflicting process or set PORT before running npm run dev.`
  );
  process.exit(1);
}

const unavailableMsg =
  unavailable.length > 0 ? ` (ports ${unavailable.join(', ')} already in use)` : '';

console.log(`[dev] Recommended port: ${recommendedPort}${unavailableMsg}.`);

const removeStaleLock = async () => {
  try {
    await fs.rm(lockFile);
    console.log(`[dev] Removed stale Next.js lock file at ${lockFile}.`);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[dev] Unable to delete lock file (${error.message}).`);
    }
  }
};

await removeStaleLock();

const devProcess = spawn(
  process.execPath,
  [nextBin, 'dev', '-p', String(recommendedPort), '-H', host],
  {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(recommendedPort) },
  }
);

devProcess.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
