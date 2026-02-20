import fs from "node:fs";
import path from "node:path";
import pino from "pino";

/**
 * Relay Agent Logger - Pino-based structured logging
 *
 * Log Level Convention:
 *   error - Unrecoverable errors, failed state transitions, WhatsApp disconnection failures
 *   warn  - Invalid transition attempts, heartbeat timer discards, stale PID cleanup
 *   info  - State transitions, instance creation/completion, daemon start/stop
 *   debug - Incoming/outgoing messages, agent tool calls, timer scheduling
 */

const LOG_DIR = path.resolve(".relay-agent", "logs");
const LOG_FILE = path.join(LOG_DIR, "relay.log");

function ensureLogDir(): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Creates a configured Pino logger instance.
 *
 * - Logs structured JSON to `.relay-agent/logs/relay.log`
 * - In development (NODE_ENV !== 'production'), also outputs pretty-printed logs to console
 * - Log level is controlled by RELAY_LOG_LEVEL env var (default: 'info')
 */
export function createLogger(name = "relay-agent"): pino.Logger {
  ensureLogDir();

  const level = process.env.RELAY_LOG_LEVEL ?? "info";
  const isDev = process.env.NODE_ENV !== "production";

  const targets: pino.TransportTargetOptions[] = [
    {
      target: "pino/file",
      options: { destination: LOG_FILE, mkdir: true },
      level,
    },
  ];

  if (isDev) {
    targets.push({
      target: "pino-pretty",
      options: { colorize: true },
      level,
    });
  }

  return pino({
    name,
    level,
    transport: { targets },
  });
}

/** Default singleton logger instance for the relay agent */
const logger = createLogger();

export default logger;
