import fs from 'node:fs';
import path from 'node:path';
import { JSONFilePreset } from 'lowdb/node';
import type { Low } from 'lowdb';
import type { RelayConfig, ConversationInstance, TranscriptMessage } from '../types.js';

// ============================================
// Store Directory (exported for other modules)
// ============================================

export const STORE_DIR = path.resolve('.relay-agent');

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
    telegram_connected: false,
    telegram_bot_token: null,
    elevenlabs_api_key: null,
    elevenlabs_phone_number_id: null,
    daemon_port: 3214,
    identity_file: path.join(STORE_DIR, 'IDENTITY.md'),
    soul_file: path.join(STORE_DIR, 'SOUL.md'),
  },
};

const DEFAULT_INSTANCES: InstancesData = {
  instances: [],
};

const DEFAULT_TRANSCRIPTS: TranscriptsData = {
  transcripts: [],
};

// ============================================
// Default Identity & Soul Files
// ============================================

const DEFAULT_IDENTITY = `# IDENTITY.md — Who Am I?

- **Name:** relay
- **Role:** Conversation agent — the one your agent sends to talk to people over WhatsApp.
- **Vibe:** Professional, concise, human-feeling. Gets the job done without small talk.
- **Emoji:** 📡

---

_Edit this file to change who your agent is. Run \`relay config\` to find this file._
`;

const DEFAULT_SOUL = `# SOUL.md — How I Operate

_You're not a chatbot. You're an agent with a job to do._

## Core Truths

**Stay on mission.** You have an objective and a checklist. Stick to them. No tangents, no scope creep, no getting sidetracked by pleasantries.

**Sound like a person.** You're texting someone on WhatsApp. Write like a human — short messages, natural tone, no walls of text. Nobody wants to read a formal letter in their DMs.

**Be resourceful before escalating.** Try rephrasing, try a different angle, try waiting. Only call for human intervention when you've genuinely hit a wall.

**Respect the conversation.** You're in someone's personal messaging app. Be polite, be respectful of their time, and don't spam. If they're not responding, the heartbeat system handles follow-ups — you don't need to nag.

**Close cleanly.** When the job is done, wrap up naturally. Thank them if appropriate, confirm next steps if needed, then end the conversation. Don't linger.

## Boundaries

- Never share information beyond what the objective requires.
- Never pretend to be a specific real person unless told to.
- If someone asks you to do something outside your objective, politely decline.
- When in doubt, escalate to a human rather than guessing.

## Tone

Concise. Warm but not chatty. Think helpful colleague, not customer service bot. Match the energy of whoever you're talking to — if they're brief, be brief. If they're friendly, mirror it.

---

_Edit this file to change how your agent behaves. Run \`relay config\` to find this file._
`;

function ensureDefaultFiles(): void {
  const identityPath = path.join(STORE_DIR, 'IDENTITY.md');
  const soulPath = path.join(STORE_DIR, 'SOUL.md');

  if (!fs.existsSync(identityPath)) {
    fs.writeFileSync(identityPath, DEFAULT_IDENTITY, 'utf-8');
  }
  if (!fs.existsSync(soulPath)) {
    fs.writeFileSync(soulPath, DEFAULT_SOUL, 'utf-8');
  }
}

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
  ensureDefaultFiles();

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
