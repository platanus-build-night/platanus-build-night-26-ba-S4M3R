import path from 'node:path';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type ConnectionState,
  type WAMessage,
} from '@whiskeysockets/baileys';
import type { Boom } from '@hapi/boom';
import logger from '../utils/logger.js';
import { updateConfig } from '../store/config.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const AUTH_DIR = path.resolve('.relay-agent', 'whatsapp-auth');

/** Maximum reconnection attempts before giving up */
const MAX_RECONNECT_ATTEMPTS = 5;

/** Maximum backoff delay in milliseconds */
const MAX_BACKOFF_MS = 30_000;

/** Current socket reference (null when not connected) */
let socket: WASocket | null = null;

/** Current connection state string */
let connectionState: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

/** Consecutive reconnection failure count */
let reconnectAttempts = 0;

/** Registered message callbacks */
const messageCallbacks: Array<(message: IncomingMessage) => void> = [];

/** Reconnect timer reference for cleanup */
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IncomingMessage {
  /** Sender phone number (without @s.whatsapp.net suffix) */
  senderPhone: string;
  /** Raw sender JID */
  senderJid: string;
  /** Text content of the message */
  text: string;
  /** Message timestamp (ISO 8601) */
  timestamp: string;
  /** Raw Baileys message object */
  raw: WAMessage;
}

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

/**
 * Initialise the WhatsApp socket via Baileys.
 *
 * - Persists auth state in `.relay-agent/whatsapp-auth/`
 * - Prints QR code directly in the terminal (Baileys built-in)
 * - Handles connection lifecycle events
 * - Auto-reconnects on transient disconnections with exponential backoff
 */
export async function connectWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const baileysLogger = logger.child({ module: 'baileys' });

  const sock = makeWASocket({
    auth: state,
    logger: baileysLogger as never, // Baileys expects pino logger; cast to satisfy strict mode
  });

  socket = sock;
  connectionState = 'connecting';

  // --- Credential persistence ------------------------------------------------
  sock.ev.on('creds.update', saveCreds);

  // --- Connection state updates ----------------------------------------------
  sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
    handleConnectionUpdate(update, sock, saveCreds);
  });

  // --- Incoming messages -----------------------------------------------------
  sock.ev.on('messages.upsert', (upsert) => {
    handleMessagesUpsert(upsert);
  });
}

// ---------------------------------------------------------------------------
// Event handlers (internal)
// ---------------------------------------------------------------------------

function handleConnectionUpdate(
  update: Partial<ConnectionState>,
  sock: WASocket,
  _saveCreds: () => Promise<void>,
): void {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    logger.info('QR code displayed in terminal. Scan with WhatsApp to authenticate.');
  }

  if (connection === 'open') {
    connectionState = 'connected';
    reconnectAttempts = 0;
    logger.info('WhatsApp connection established');
    updateConfig({ whatsapp_connected: true }).catch((err: unknown) => {
      logger.error({ err }, 'Failed to update config after WhatsApp connection');
    });
  }

  if (connection === 'close') {
    connectionState = 'disconnected';
    socket = null;

    const boom = lastDisconnect?.error as Boom | undefined;
    const statusCode = boom?.output?.statusCode ?? 0;
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

    logger.warn(
      { statusCode, shouldReconnect, attempt: reconnectAttempts + 1 },
      'WhatsApp connection closed',
    );

    if (shouldReconnect) {
      scheduleReconnect();
    } else {
      logger.error(
        'WhatsApp logged out. Re-authentication required. Run `relay init` to reconnect.',
      );
      updateConfig({ whatsapp_connected: false }).catch((err: unknown) => {
        logger.error({ err }, 'Failed to update config after WhatsApp logout');
      });
    }
  }
}

function handleMessagesUpsert(upsert: {
  messages: WAMessage[];
  type: string;
  requestId?: string;
}): void {
  // Only process real-time notifications, not history sync
  if (upsert.type !== 'notify') {
    return;
  }

  for (const msg of upsert.messages) {
    // Skip messages sent by us
    if (msg.key.fromMe) {
      continue;
    }

    const text = extractMessageText(msg);
    if (!text) {
      continue;
    }

    const senderJid = msg.key.remoteJid ?? '';
    const senderPhone = jidToPhone(senderJid);
    const timestamp = msg.messageTimestamp
      ? new Date(
          typeof msg.messageTimestamp === 'number'
            ? msg.messageTimestamp * 1000
            : Number(msg.messageTimestamp) * 1000,
        ).toISOString()
      : new Date().toISOString();

    const incoming: IncomingMessage = {
      senderPhone,
      senderJid,
      text,
      timestamp,
      raw: msg,
    };

    logger.debug(
      { senderPhone, textLength: text.length },
      'Incoming WhatsApp message',
    );

    for (const cb of messageCallbacks) {
      try {
        cb(incoming);
      } catch (err) {
        logger.error({ err }, 'Error in message callback');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Reconnection with exponential backoff
// ---------------------------------------------------------------------------

function scheduleReconnect(): void {
  reconnectAttempts += 1;

  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    logger.error(
      { attempts: reconnectAttempts },
      'Max WhatsApp reconnection attempts exceeded. Setting whatsapp_connected = false.',
    );
    updateConfig({ whatsapp_connected: false }).catch((err: unknown) => {
      logger.error({ err }, 'Failed to update config after max reconnect attempts');
    });
    return;
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s capped at 30s
  const delayMs = Math.min(
    1000 * Math.pow(2, reconnectAttempts - 1),
    MAX_BACKOFF_MS,
  );

  logger.info(
    { attempt: reconnectAttempts, delayMs },
    'Scheduling WhatsApp reconnection',
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWhatsApp().catch((err: unknown) => {
      logger.error({ err }, 'WhatsApp reconnection failed');
    });
  }, delayMs);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current WhatsApp connection state.
 */
export function getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
  return connectionState;
}

/**
 * Returns the active Baileys socket instance, or null if not connected.
 */
export function getSocket(): WASocket | null {
  return socket;
}

/**
 * Returns whether the WhatsApp connection is currently open.
 */
export function isConnected(): boolean {
  return connectionState === 'connected';
}

/**
 * Send a text message to a WhatsApp JID.
 *
 * @throws Error if the socket is not connected
 */
export async function sendMessage(jid: string, text: string): Promise<void> {
  if (!socket) {
    throw new Error('WhatsApp is not connected. Cannot send message.');
  }

  await socket.sendMessage(jid, { text });
  logger.debug({ jid, textLength: text.length }, 'WhatsApp message sent');
}

/**
 * Register a callback to be invoked for each incoming WhatsApp message.
 */
export function onMessage(callback: (message: IncomingMessage) => void): void {
  messageCallbacks.push(callback);
}

/**
 * Gracefully disconnect from WhatsApp and clean up resources.
 */
export async function disconnectWhatsApp(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    socket.end(undefined);
    socket = null;
  }

  connectionState = 'disconnected';
  reconnectAttempts = 0;
  messageCallbacks.length = 0;

  logger.info('WhatsApp disconnected');
}

// ---------------------------------------------------------------------------
// JID / Phone utilities
// ---------------------------------------------------------------------------

/**
 * Convert a phone number in international format to a WhatsApp JID.
 *
 * Strips the leading `+` and appends `@s.whatsapp.net`.
 *
 * @example phoneToJid('+56912345678') // '56912345678@s.whatsapp.net'
 */
export function phoneToJid(phone: string): string {
  const stripped = phone.startsWith('+') ? phone.slice(1) : phone;
  return `${stripped}@s.whatsapp.net`;
}

/**
 * Extract a phone number from a WhatsApp JID.
 *
 * Removes the `@s.whatsapp.net` or `@lid` suffix.
 */
function jidToPhone(jid: string): string {
  return jid.split('@')[0] ?? jid;
}

// ---------------------------------------------------------------------------
// Message text extraction
// ---------------------------------------------------------------------------

/**
 * Extract the text content from a Baileys WAMessage.
 *
 * Handles several message types: conversation, extendedTextMessage, imageMessage (caption),
 * videoMessage (caption).
 */
function extractMessageText(msg: WAMessage): string | null {
  const message = msg.message;
  if (!message) {
    return null;
  }

  // Simple text conversation
  if (message.conversation) {
    return message.conversation;
  }

  // Extended text message (reply, link preview, etc.)
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }

  // Image/video caption
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption;
  }

  if (message.videoMessage?.caption) {
    return message.videoMessage.caption;
  }

  return null;
}
