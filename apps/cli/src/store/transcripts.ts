import { v4 as uuidv4 } from 'uuid';
import type { TranscriptMessage } from '../types.js';
import { getTranscriptsDb } from './index.js';

/**
 * Appends a transcript message with a generated UUID and flushes to disk.
 */
export async function append(
  message: Omit<TranscriptMessage, 'id'>,
): Promise<TranscriptMessage> {
  const db = getTranscriptsDb();

  const entry: TranscriptMessage = {
    ...message,
    id: uuidv4(),
  };

  db.data.transcripts.push(entry);
  await db.write();

  return entry;
}

/**
 * Returns all transcript messages for a given instance ID, ordered by timestamp ascending.
 */
export async function getByInstance(instanceId: string): Promise<TranscriptMessage[]> {
  const db = getTranscriptsDb();
  await db.read();

  return db.data.transcripts
    .filter((msg) => msg.instance_id === instanceId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
