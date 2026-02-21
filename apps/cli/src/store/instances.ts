import { v4 as uuidv4 } from 'uuid';
import type { ConversationInstance, TerminalState } from '../types.js';
import { getInstancesDb } from './index.js';

const TERMINAL_STATES: ReadonlySet<string> = new Set<TerminalState>(['COMPLETED', 'ABANDONED', 'FAILED']);

/** Backfill channel for instances created before the field existed. */
function ensureChannel(inst: ConversationInstance): ConversationInstance {
  if (!inst.channel) {
    inst.channel = 'whatsapp';
  }
  return inst;
}

/**
 * Creates a new conversation instance with generated UUID and timestamps.
 */
export async function create(
  data: Omit<ConversationInstance, 'id' | 'created_at' | 'updated_at'>,
): Promise<ConversationInstance> {
  const db = getInstancesDb();
  const now = new Date().toISOString();

  const instance: ConversationInstance = {
    ...data,
    id: uuidv4(),
    created_at: now,
    updated_at: now,
  };

  db.data.instances.push(instance);
  await db.write();

  return instance;
}

/**
 * Finds a conversation instance by ID. Returns null if not found.
 */
export async function getById(id: string): Promise<ConversationInstance | null> {
  const db = getInstancesDb();
  await db.read();
  const inst = db.data.instances.find((inst) => inst.id === id);
  return inst ? ensureChannel(inst) : null;
}

/**
 * Returns all conversation instances.
 */
export async function getAll(): Promise<ConversationInstance[]> {
  const db = getInstancesDb();
  await db.read();
  return db.data.instances.map(ensureChannel);
}

/**
 * Returns all conversation instances for a given contact.
 */
export async function getByContact(contact: string): Promise<ConversationInstance[]> {
  const db = getInstancesDb();
  await db.read();
  return db.data.instances.filter((inst) => inst.target_contact === contact);
}

/**
 * Returns the active instance for a contact: one that is in a non-terminal, non-QUEUED state.
 * Returns null if no such instance exists.
 */
export async function getActiveForContact(contact: string): Promise<ConversationInstance | null> {
  const db = getInstancesDb();
  await db.read();
  return (
    db.data.instances.find(
      (inst) =>
        inst.target_contact === contact &&
        !TERMINAL_STATES.has(inst.state) &&
        inst.state !== 'QUEUED',
    ) ?? null
  );
}

/**
 * Updates a conversation instance by ID. Sets updated_at automatically.
 * Throws if the instance is not found.
 */
export async function update(
  id: string,
  data: Partial<ConversationInstance>,
): Promise<ConversationInstance> {
  const db = getInstancesDb();
  await db.read();

  const index = db.data.instances.findIndex((inst) => inst.id === id);
  if (index === -1) {
    throw new Error(`Instance not found: ${id}`);
  }

  const updated: ConversationInstance = {
    ...db.data.instances[index],
    ...data,
    id, // Prevent ID override
    updated_at: new Date().toISOString(),
  };

  db.data.instances[index] = updated;
  await db.write();

  return updated;
}
