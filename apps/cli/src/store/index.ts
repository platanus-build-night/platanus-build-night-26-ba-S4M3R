import fs from 'node:fs';
import path from 'node:path';
import { JSONFilePreset } from 'lowdb/node';
import type { Low } from 'lowdb';
import type { RelayConfig, ConversationInstance, TranscriptMessage } from '../types.js';

// ============================================
// Database Schema Types
// ============================================

export interface ConfigData {
  config: RelayConfig;
}

export interface InstancesData {
  instances: ConversationInstance[];
}

export interface TranscriptsData {
  transcripts: TranscriptMessage[];
}

// ============================================
// Default Data
// ============================================

const DEFAULT_CONFIG: ConfigData = {
  config: {
    model_api_key: null,
    model_provider: null,
    whatsapp_connected: false,
    daemon_port: 3214,
  },
};

const DEFAULT_INSTANCES: InstancesData = {
  instances: [],
};

const DEFAULT_TRANSCRIPTS: TranscriptsData = {
  transcripts: [],
};

// ============================================
// Store Directory
// ============================================

const STORE_DIR = path.resolve('.relay-agent');

function ensureStoreDir(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

// ============================================
// Database Instances
// ============================================

let configDb: Low<ConfigData> | null = null;
let instancesDb: Low<InstancesData> | null = null;
let transcriptsDb: Low<TranscriptsData> | null = null;

/**
 * Returns the config database instance.
 * Throws if stores have not been initialized.
 */
export function getConfigDb(): Low<ConfigData> {
  if (!configDb) {
    throw new Error('Stores not initialized. Call initStores() first.');
  }
  return configDb;
}

/**
 * Returns the instances database instance.
 * Throws if stores have not been initialized.
 */
export function getInstancesDb(): Low<InstancesData> {
  if (!instancesDb) {
    throw new Error('Stores not initialized. Call initStores() first.');
  }
  return instancesDb;
}

/**
 * Returns the transcripts database instance.
 * Throws if stores have not been initialized.
 */
export function getTranscriptsDb(): Low<TranscriptsData> {
  if (!transcriptsDb) {
    throw new Error('Stores not initialized. Call initStores() first.');
  }
  return transcriptsDb;
}

/**
 * Initializes all three lowdb databases and ensures the .relay-agent/ directory exists.
 * Must be called before any store operations.
 */
export async function initStores(): Promise<void> {
  ensureStoreDir();

  configDb = await JSONFilePreset<ConfigData>(
    path.join(STORE_DIR, 'config.json'),
    DEFAULT_CONFIG,
  );

  instancesDb = await JSONFilePreset<InstancesData>(
    path.join(STORE_DIR, 'instances.json'),
    DEFAULT_INSTANCES,
  );

  transcriptsDb = await JSONFilePreset<TranscriptsData>(
    path.join(STORE_DIR, 'transcripts.json'),
    DEFAULT_TRANSCRIPTS,
  );
}
