import type { RelayConfig } from '../types.js';
import { getConfigDb } from './index.js';

/**
 * Returns the current relay configuration.
 */
export async function getConfig(): Promise<RelayConfig> {
  const db = getConfigDb();
  await db.read();
  return db.data.config;
}

/**
 * Merges partial configuration into the existing config and flushes to disk.
 */
export async function updateConfig(partial: Partial<RelayConfig>): Promise<void> {
  const db = getConfigDb();
  await db.read();
  db.data.config = { ...db.data.config, ...partial };
  await db.write();
}
