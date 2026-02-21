import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import logger from '../utils/logger.js';

// ============================================
// Constants
// ============================================

const STORE_DIR = path.resolve('.relay-agent');
const PID_FILE = path.join(STORE_DIR, 'daemon.pid');
const DAEMON_HOST = '127.0.0.1';
const DAEMON_PORT = 3214;

/** Maximum time (ms) to wait for the server to respond after spawn. */
const START_POLL_TIMEOUT_MS = 10_000;
/** Interval (ms) between health check polls. */
const START_POLL_INTERVAL_MS = 200;
/** Maximum time (ms) to wait for the process to exit after SIGTERM. */
const STOP_TIMEOUT_MS = 5_000;
/** Interval (ms) between checking if process has exited. */
const STOP_POLL_INTERVAL_MS = 100;

// ============================================
// PID File Management
// ============================================

/**
 * Ensures the .relay-agent/ directory exists.
 */
function ensureStoreDir(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

/**
 * Writes the given PID to .relay-agent/daemon.pid.
 */
export function writePid(pid: number): void {
  ensureStoreDir();
  fs.writeFileSync(PID_FILE, String(pid), 'utf-8');
}

/**
 * Reads the PID from .relay-agent/daemon.pid.
 * Returns null if the file does not exist or contains invalid content.
 */
export function readPid(): number | null {
  try {
    const content = fs.readFileSync(PID_FILE, 'utf-8').trim();
    const pid = parseInt(content, 10);
    if (isNaN(pid) || pid <= 0) {
      return null;
    }
    return pid;
  } catch {
    return null;
  }
}

/**
 * Removes the PID file if it exists.
 */
export function removePid(): void {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // File may not exist; that is fine
  }
}

/**
 * Checks if a process with the given PID is currently running.
 * Uses process.kill(pid, 0) which sends no signal but checks existence.
 */
export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the daemon is currently running.
 * Reads the PID file and verifies the process is alive.
 * Handles stale PID files by removing them and returning false.
 */
export function isDaemonRunning(): boolean {
  const pid = readPid();
  if (pid === null) {
    return false;
  }

  if (isRunning(pid)) {
    return true;
  }

  // Stale PID file: process not running but file exists
  logger.warn({ pid }, 'Stale PID file detected, removing');
  removePid();
  return false;
}

/**
 * Returns the daemon PID if the daemon is running, null otherwise.
 */
export function getDaemonPid(): number | null {
  const pid = readPid();
  if (pid === null) {
    return null;
  }
  if (!isRunning(pid)) {
    return null;
  }
  return pid;
}

// ============================================
// Health Check
// ============================================

/**
 * Polls the daemon HTTP server until it responds or the timeout elapses.
 * Returns true if the server responds with a valid status, false on timeout.
 */
function waitForServer(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const poll = (): void => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        resolve(false);
        return;
      }

      const req = http.get(
        { host: DAEMON_HOST, port: DAEMON_PORT, path: '/status', timeout: 1000 },
        (res) => {
          // Any response (even error status) means the server is up
          res.resume(); // Drain the response
          resolve(true);
        },
      );

      req.on('error', () => {
        setTimeout(poll, START_POLL_INTERVAL_MS);
      });

      req.on('timeout', () => {
        req.destroy();
        setTimeout(poll, START_POLL_INTERVAL_MS);
      });
    };

    poll();
  });
}

// ============================================
// Daemon Lifecycle
// ============================================

/**
 * Starts the daemon as a detached background process.
 *
 * - Checks if daemon is already running
 * - Spawns a new Node.js process running the daemon entry point
 * - Waits for the server to respond on port 3214
 * - On success, logs the PID
 */
export async function startDaemon(): Promise<void> {
  if (isDaemonRunning()) {
    const pid = readPid();
    console.log(`Daemon already running (PID: ${pid})`);
    return;
  }

  ensureStoreDir();

  // Resolve the entry point path.
  // In production, use compiled JS; in development, use tsx for TypeScript.
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const entryTs = path.join(currentDir, 'entry.ts');
  const entryJs = path.join(currentDir, 'entry.js');

  // Determine whether to use tsx (dev) or node (production)
  let command: string;
  let args: string[];

  if (fs.existsSync(entryJs)) {
    // Production: compiled JS exists
    command = process.execPath; // node
    args = [entryJs];
  } else if (fs.existsSync(entryTs)) {
    // Development: use tsx to run TypeScript directly
    command = 'npx';
    args = ['tsx', entryTs];
  } else {
    throw new Error(
      `Daemon entry point not found. Expected ${entryJs} or ${entryTs}. Run "npm run build" first.`,
    );
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  child.unref();

  const childPid = child.pid;
  if (childPid === undefined) {
    throw new Error('Failed to spawn daemon process: no PID returned');
  }

  // Wait for the server to become responsive
  const serverReady = await waitForServer(START_POLL_TIMEOUT_MS);

  if (!serverReady) {
    // Server did not respond in time; attempt cleanup
    try {
      process.kill(childPid, 'SIGTERM');
    } catch {
      // Process may have already exited
    }
    removePid();
    throw new Error(
      `Daemon process spawned (PID: ${childPid}) but server did not respond on ${DAEMON_HOST}:${DAEMON_PORT} within ${START_POLL_TIMEOUT_MS}ms. ` +
      'Check if port 3214 is already in use or review logs in .relay-agent/logs/relay.log',
    );
  }

  console.log(`Daemon started (PID: ${childPid})`);
}

/**
 * Stops the running daemon process.
 *
 * - Reads PID from file
 * - Sends SIGTERM
 * - Waits for the process to exit
 * - Removes PID file
 */
export async function stopDaemon(): Promise<void> {
  const pid = readPid();

  if (pid === null) {
    console.log('Daemon is not running (no PID file found)');
    return;
  }

  if (!isRunning(pid)) {
    logger.warn({ pid }, 'Stale PID file detected, cleaning up');
    removePid();
    console.log('Daemon is not running (stale PID file removed)');
    return;
  }

  // Send SIGTERM for graceful shutdown
  try {
    process.kill(pid, 'SIGTERM');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ pid, error: message }, 'Failed to send SIGTERM to daemon');
    removePid();
    throw new Error(`Failed to stop daemon (PID: ${pid}): ${message}`);
  }

  // Wait for the process to exit
  const exitedCleanly = await waitForProcessExit(pid, STOP_TIMEOUT_MS);

  if (!exitedCleanly) {
    // Force kill if graceful shutdown timed out
    logger.warn({ pid }, 'Daemon did not exit gracefully, sending SIGKILL');
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process may have exited between check and kill
    }
  }

  removePid();
  console.log('Daemon stopped');
}

/**
 * Waits for a process to exit by polling process.kill(pid, 0).
 * Returns true if the process exited within the timeout, false otherwise.
 */
function waitForProcessExit(pid: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const poll = (): void => {
      if (!isRunning(pid)) {
        resolve(true);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(poll, STOP_POLL_INTERVAL_MS);
    };

    poll();
  });
}
