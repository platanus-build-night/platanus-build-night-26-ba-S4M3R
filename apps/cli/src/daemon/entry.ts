import fs from 'node:fs';
import path from 'node:path';
import { startServer, stopServer } from './server.js';
import { removePid, writePid } from './lifecycle.js';
import { connectWhatsApp, disconnectWhatsApp, onMessage } from '../whatsapp/connection.js';
import { createMessageHandler } from '../whatsapp/handler.js';
import { reconstructTimers, cancelAllHeartbeats, cancelHeartbeat } from '../engine/heartbeat.js';
import { onTerminalState } from '../engine/state-machine.js';
import { createSession, destroySession, destroyAllSessions } from '../agent/session.js';
import { onInstanceTerminal } from '../engine/queue.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import { getConfigDb, getInstancesDb, getTranscriptsDb } from '../store/index.js';
import { transition } from '../engine/state-machine.js';
import { scheduleHeartbeat } from '../engine/heartbeat.js';
import logger from '../utils/logger.js';

const AUTH_DIR = path.resolve('.relay-agent', 'whatsapp-auth');

/** Flag to prevent double-shutdown */
let isShuttingDown = false;

/**
 * Daemon entry point.
 *
 * This file is the target for child_process.spawn() when starting the daemon
 * as a detached background process. It:
 * 1. Starts the HTTP server (which initializes stores internally)
 * 2. Writes the PID file for lifecycle management
 * 3. Reconstructs state from persisted JSON files
 * 4. Auto-connects WhatsApp if auth state exists
 * 5. Registers the incoming message handler
 * 6. Handles graceful shutdown on SIGTERM/SIGINT
 */

async function main(): Promise<void> {
  // Register terminal state cleanup hook before starting server
  onTerminalState(async (instanceId: string) => {
    cancelHeartbeat(instanceId);
    destroySession(instanceId);
    await onInstanceTerminal(instanceId);
  });

  try {
    await startServer();
    writePid(process.pid);
    logger.info({ pid: process.pid }, 'Daemon process started');

    // Reconstruct state from persisted JSON files (daemon restart recovery)
    await reconstructState();

    // Register the message handler for incoming WhatsApp messages
    const messageHandler = createMessageHandler();
    onMessage(messageHandler);

    // Auto-connect WhatsApp if auth state exists from a previous session
    if (fs.existsSync(AUTH_DIR)) {
      logger.info('WhatsApp auth state found, auto-connecting');
      try {
        await connectWhatsApp();
      } catch (err) {
        const waError = err instanceof Error ? err.message : 'Unknown error';
        logger.warn({ error: waError }, 'WhatsApp auto-connect failed on startup (will retry on relay init)');
      }
    } else {
      logger.info('No WhatsApp auth state found. Run `relay init` to connect.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Detect port conflict
    if (message.includes('EADDRINUSE')) {
      logger.error({ error: message }, 'Port 3214 is already in use. Stop the conflicting process or configure a different port.');
    } else {
      logger.error({ error: message }, 'Failed to start daemon');
    }
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      logger.warn({ signal }, 'Shutdown already in progress, ignoring duplicate signal');
      return;
    }
    isShuttingDown = true;

    logger.info({ signal }, 'Shutting down gracefully...');
    try {
      // 1. Cancel all heartbeat timers
      cancelAllHeartbeats();

      // 2. Destroy all agent sessions
      destroyAllSessions();

      // 3. Disconnect WhatsApp
      await disconnectWhatsApp();

      // 4. Flush all lowdb stores to disk
      try {
        await getConfigDb().write();
        await getInstancesDb().write();
        await getTranscriptsDb().write();
        logger.info('All stores flushed to disk');
      } catch (flushErr) {
        const flushMsg = flushErr instanceof Error ? flushErr.message : 'Unknown error';
        logger.error({ error: flushMsg }, 'Failed to flush stores to disk during shutdown');
      }

      // 5. Stop HTTP server
      await stopServer();

      // 6. Remove PID file
      removePid();

      logger.info('Shutdown complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message }, 'Error during daemon shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

/**
 * Reconstructs state from persisted JSON files after daemon restart.
 *
 * For each non-terminal instance:
 * - WAITING_FOR_REPLY, HEARTBEAT_SCHEDULED: reconstruct heartbeat timers
 * - ACTIVE, WAITING_FOR_AGENT: reconstruct agent sessions
 * - CREATED: auto-activate (create session, send first message)
 * - PAUSED, QUEUED: no action needed
 */
async function reconstructState(): Promise<void> {
  try {
    const allInstances = await InstanceStore.getAll();
    const terminalStates = new Set(['COMPLETED', 'ABANDONED', 'FAILED']);
    const nonTerminal = allInstances.filter((inst) => !terminalStates.has(inst.state));

    if (nonTerminal.length === 0) {
      logger.info('No non-terminal instances to restore');
      return;
    }

    let restoredCount = 0;

    for (const instance of nonTerminal) {
      try {
        switch (instance.state) {
          case 'WAITING_FOR_REPLY':
          case 'HEARTBEAT_SCHEDULED':
            // Reconstruct heartbeat timers (full interval since exact remaining time is lost)
            scheduleHeartbeat(instance.id, instance.heartbeat_config.interval_ms);
            // Also reconstruct agent session for when contact replies
            await createSession(instance);
            restoredCount++;
            break;

          case 'ACTIVE':
          case 'WAITING_FOR_AGENT':
            // Reconstruct agent session
            await createSession(instance);
            restoredCount++;
            break;

          case 'CREATED':
            // Auto-activate: create session and send first message
            try {
              await transition(instance.id, 'agent_sends_first_message');
              await createSession(instance);
              const { processWithAgent } = await import('../agent/session.js');
              await processWithAgent(instance.id, 'You are starting a new conversation. Send your first message to the contact to begin working on the objective.');
              scheduleHeartbeat(instance.id, instance.heartbeat_config.interval_ms);
            } catch (activateErr) {
              const activateMsg = activateErr instanceof Error ? activateErr.message : 'Unknown error';
              logger.error(
                { instanceId: instance.id, error: activateMsg },
                'Failed to auto-activate CREATED instance on restart',
              );
            }
            restoredCount++;
            break;

          case 'PAUSED':
          case 'QUEUED':
          case 'NEEDS_HUMAN_INTERVENTION':
            // No action needed for these states
            restoredCount++;
            break;

          default:
            logger.warn(
              { instanceId: instance.id, state: instance.state },
              'Unknown state during reconstruction, skipping',
            );
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          { instanceId: instance.id, state: instance.state, error: errMsg },
          'Failed to restore instance during reconstruction',
        );
      }
    }

    logger.info({ count: restoredCount }, `Restored ${restoredCount} instances from disk`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.warn({ error: errMsg }, 'Failed to reconstruct state on startup');
  }
}

void main();
