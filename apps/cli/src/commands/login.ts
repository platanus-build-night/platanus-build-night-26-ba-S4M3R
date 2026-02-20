import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type ConnectionState,
} from '@whiskeysockets/baileys';
import type { Boom } from '@hapi/boom';

const AUTH_DIR = path.resolve('.relay-agent', 'whatsapp-auth');

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
      console.log('Scan the QR code below with your WhatsApp app:\n');

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: { level: 'silent', child: () => ({ level: 'silent' }) } as never,
      });

      sock.ev.on('creds.update', saveCreds);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sock.end(undefined);
          reject(new Error('QR code scan timed out after 2 minutes'));
        }, 120_000);

        sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
          const { connection, lastDisconnect } = update;

          if (connection === 'open') {
            clearTimeout(timeout);
            console.log('\nWhatsApp connected successfully!');
            console.log('Auth state saved. The daemon will use this on next start.');
            console.log('\nYou can now close this and run: relay start');

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
