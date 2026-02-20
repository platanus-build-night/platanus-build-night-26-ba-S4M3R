import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type ConnectionState,
} from '@whiskeysockets/baileys';
import type { Boom } from '@hapi/boom';

const AUTH_DIR = path.resolve('.relay-agent', 'whatsapp-auth');

/**
 * Render a QR code in the terminal using Unicode block characters.
 * No external dependency needed.
 */
function renderQR(qr: string): void {
  // Dynamic import qrcode-terminal if available, otherwise instruct user
  import('qrcode-terminal').then((mod) => {
    const qrterm = mod.default ?? mod;
    qrterm.generate(qr, { small: true }, (output: string) => {
      console.log(output);
    });
  }).catch(() => {
    // Fallback: just print the raw QR string for manual use
    console.log('\nQR Code (scan with WhatsApp):');
    console.log(qr);
    console.log('\nTip: install qrcode-terminal for a visual QR code\n');
  });
}

/**
 * `relay login` - Interactive WhatsApp authentication.
 *
 * Runs in the FOREGROUND so the user can see and scan the QR code.
 * Once authenticated, the auth state is saved to .relay-agent/whatsapp-auth/
 * and the daemon can use it on next start.
 */
export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Connect WhatsApp by scanning QR code (runs in foreground)')
    .action(async () => {
      // Ensure .relay-agent directory exists
      const baseDir = path.resolve('.relay-agent');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      console.log('Starting WhatsApp authentication...');
      console.log('A QR code will appear below. Scan it with your WhatsApp app.\n');

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      // Baileys v7 requires a real pino logger instance
      const baileysLogger = pino({ level: 'silent' });

      const sock = makeWASocket({
        auth: state,
        logger: baileysLogger as never,
      });

      sock.ev.on('creds.update', saveCreds);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sock.end(undefined);
          reject(new Error('QR code scan timed out after 2 minutes'));
        }, 120_000);

        sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
          const { connection, lastDisconnect, qr } = update;

          // Handle QR code - render it ourselves since printQRInTerminal is deprecated
          if (qr) {
            console.clear();
            console.log('Scan this QR code with WhatsApp:\n');
            renderQR(qr);
            console.log('\nWaiting for scan...');
          }

          if (connection === 'open') {
            clearTimeout(timeout);
            console.log('\nWhatsApp connected successfully!');
            console.log('Auth state saved. The daemon will use this on next start.');
            console.log('\nYou can now run: relay start');

            // Give it a moment to save creds then disconnect
            setTimeout(() => {
              sock.end(undefined);
              resolve();
            }, 2000);
          }

          if (connection === 'close') {
            const boom = lastDisconnect?.error as Boom | undefined;
            const statusCode = boom?.output?.statusCode ?? 0;

            if (statusCode === DisconnectReason.loggedOut) {
              clearTimeout(timeout);
              reject(new Error('WhatsApp logged out. Please try again.'));
            }
            // Other close reasons during auth = QR expired, will get a new one
          }
        });
      });
    });
}
