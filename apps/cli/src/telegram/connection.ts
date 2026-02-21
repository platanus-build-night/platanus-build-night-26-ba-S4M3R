import path from 'node:path';
import fs from 'node:fs';
import { Bot } from 'grammy';
import logger from '../utils/logger.js';
import { updateConfig } from '../store/config.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const AUTH_DIR = path.resolve('.relay-agent', 'telegram-auth');
const TOKEN_FILE = path.join(AUTH_DIR, 'token.json');

let bot: Bot | null = null;
let connectionState: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

/** Registered message callbacks */
const messageCallbacks: Array<(message: TelegramIncomingMessage) => void> = [];

/**
 * Bidirectional mapping between phone numbers and Telegram chat IDs.
 * Built dynamically when users share their contact or when instances provide chat IDs.
 */
const phoneToChatMap = new Map<string, string>();
const chatToPhoneMap = new Map<string, string>();

/**
 * Stores the most recent chat IDs from users who messaged the bot.
 * Used to auto-discover chat IDs when creating Telegram instances.
 */
const recentChatIds = new Set<string>();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TelegramIncomingMessage {
  /** Sender phone number (if available from contact share) or chat ID as fallback */
  senderPhone: string;
  /** Telegram chat ID */
  chatId: string;
  /** Text content of the message */
  text: string;
  /** Message timestamp (ISO 8601) */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Token persistence
// ---------------------------------------------------------------------------

export function getSavedToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      return typeof data.token === 'string' ? data.token : null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveToken(token: string): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token }), 'utf-8');
}

export function removeToken(): void {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}

export function hasAuthState(): boolean {
  return fs.existsSync(TOKEN_FILE);
}

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

export async function connectTelegram(botToken?: string): Promise<void> {
  const token = botToken ?? getSavedToken();
  if (!token) {
    throw new Error('No Telegram bot token provided. Run `relay-agent telegram login` first.');
  }

  connectionState = 'connecting';

  try {
    const newBot = new Bot(token);

    // Handle incoming text messages
    newBot.on('message:text', (ctx) => {
      const msg = ctx.message;
      const chatId = String(msg.chat.id);
      const text = msg.text;

      // Track this chat ID for future instance creation
      recentChatIds.add(chatId);

      // Try to get phone from contact mapping, fall back to chat ID
      const senderPhone = chatToPhoneMap.get(chatId) ?? chatId;

      const incoming: TelegramIncomingMessage = {
        senderPhone,
        chatId,
        text,
        timestamp: new Date(msg.date * 1000).toISOString(),
      };

      logger.info(
        { chatId, senderPhone, textLength: text.length },
        'Incoming Telegram message',
      );

      for (const cb of messageCallbacks) {
        try {
          cb(incoming);
        } catch (err) {
          logger.error({ err }, 'Error in Telegram message callback');
        }
      }
    });

    // Handle contact sharing (user shares their phone number)
    newBot.on('message:contact', (ctx) => {
      const contact = ctx.message.contact;
      if (contact.phone_number) {
        const phone = contact.phone_number.startsWith('+')
          ? contact.phone_number
          : `+${contact.phone_number}`;
        const chatId = String(ctx.message.chat.id);
        registerChatMapping(phone, chatId);
        logger.info({ phone, chatId }, 'Telegram contact shared — phone mapped to chat ID');
      }
    });

    // Handle errors
    newBot.catch((err) => {
      logger.error({ err: err.message }, 'Telegram bot error');
    });

    // Start polling (non-blocking)
    newBot.start({
      onStart: () => {
        connectionState = 'connected';
        logger.info('Telegram bot connected');
        updateConfig({ telegram_connected: true }).catch((err: unknown) => {
          logger.error({ err }, 'Failed to update config after Telegram connection');
        });
      },
    });

    bot = newBot;

    // Save token for auto-reconnect on daemon restart
    if (!botToken || botToken === getSavedToken()) {
      // Token already saved or was loaded from file
    } else {
      saveToken(token);
    }

    // Also save to config
    await updateConfig({ telegram_bot_token: token });
  } catch (err) {
    connectionState = 'disconnected';
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
  return connectionState;
}

export function isConnected(): boolean {
  return connectionState === 'connected';
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot is not connected. Cannot send message.');
  }
  await bot.api.sendMessage(Number(chatId), text);
  logger.debug({ chatId, textLength: text.length }, 'Telegram message sent');
}

export function onMessage(callback: (message: TelegramIncomingMessage) => void): void {
  messageCallbacks.push(callback);
}

export async function disconnectTelegram(): Promise<void> {
  if (bot) {
    await bot.stop();
    bot = null;
  }
  connectionState = 'disconnected';
  messageCallbacks.length = 0;
  logger.info('Telegram bot disconnected');
}

// ---------------------------------------------------------------------------
// Chat ID / Phone mapping
// ---------------------------------------------------------------------------

export function registerChatMapping(phone: string, chatId: string): void {
  const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
  phoneToChatMap.set(normalizedPhone, chatId);
  chatToPhoneMap.set(chatId, normalizedPhone);
}

export function getChatIdForPhone(phone: string): string | null {
  const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
  return phoneToChatMap.get(normalizedPhone) ?? null;
}

export function getPhoneForChatId(chatId: string): string | null {
  return chatToPhoneMap.get(chatId) ?? null;
}

export function getRecentChatIds(): string[] {
  return Array.from(recentChatIds);
}

export async function getBotInfo(): Promise<{ username: string; name: string } | null> {
  if (!bot) return null;
  try {
    const me = await bot.api.getMe();
    return { username: me.username ?? '', name: `${me.first_name}${me.last_name ? ` ${me.last_name}` : ''}` };
  } catch {
    return null;
  }
}
