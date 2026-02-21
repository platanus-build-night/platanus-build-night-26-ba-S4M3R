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
 * Attempt a WhatsApp connection. If stale auth causes a "logged out" disconnect,
 * clear the auth directory and retry once with a fresh session.
 */
async function connectWithRetry(isRetry = false): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const baileysLogger = pino({ level: 'silent' });

  const sock = makeWASocket({
    auth: state,
    logger: baileysLogger as never,
  });

  sock.ev.on('creds.update', saveCreds);

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sock.end(undefined);
      reject(new Error('QR code scan timed out after 2 minutes'));
    }, 120_000);

    sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

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
          sock.end(undefined);
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });

          if (isRetry) {
            reject(new Error('WhatsApp rejected authentication. Please try again later.'));
            return;
          }

          console.log('Stale session detected, clearing auth and retrying...\n');
          connectWithRetry(true).then(resolve, reject);
        }
      }
    });
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
  const whatsapp = program
    .command('whatsapp')
    .description('WhatsApp connection management');

  whatsapp
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

      await connectWithRetry();
    });

  whatsapp
    .command('logout')
    .description('Clear saved WhatsApp authentication')
    .action(() => {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        console.log('WhatsApp auth state cleared. Run `relay whatsapp login` to re-authenticate.');
      } else {
        console.log('No WhatsApp auth state found.');
      }
    });

  whatsapp
    .command('status')
    .description('Check WhatsApp connection status')
    .action(async () => {
      if (!fs.existsSync(AUTH_DIR) || fs.readdirSync(AUTH_DIR).length === 0) {
        console.log('Not logged in. Run `relay whatsapp login` to authenticate.');
        return;
      }

      console.log('Auth credentials found. Checking connection...\n');

      const { state } = await useMultiFileAuthState(AUTH_DIR);
      const baileysLogger = pino({ level: 'silent' });

      const sock = makeWASocket({
        auth: state,
        logger: baileysLogger as never,
      });

      let resolved = false;
      const checkTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          sock.end(undefined);
          console.log('Status: Could not reach WhatsApp servers (timeout).');
        }
      }, 15_000);

      sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        if (resolved) return;
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
          resolved = true;
          clearTimeout(checkTimeout);
          const user = sock.user;
          console.log('Status: Connected');
          if (user) {
            console.log('Phone:  +%s', user.id.split(':')[0] ?? user.id);
            console.log('Name:   %s', user.name ?? '(unknown)');
          }
          sock.end(undefined);
        }

        if (connection === 'close') {
          resolved = true;
          clearTimeout(checkTimeout);
          const boom = lastDisconnect?.error as Boom | undefined;
          const statusCode = boom?.output?.statusCode ?? 0;

          if (statusCode === DisconnectReason.loggedOut) {
            console.log('Status: Logged out (session expired). Run `relay whatsapp login`.');
          } else {
            console.log('Status: Disconnected (code %d). Try `relay whatsapp login`.', statusCode);
          }
        }
      });
    });
}
