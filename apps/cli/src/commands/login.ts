import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { exec } from 'node:child_process';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type ConnectionState,
} from '@whiskeysockets/baileys';
import type { Boom } from '@hapi/boom';

const AUTH_DIR = path.resolve('.relay-agent', 'whatsapp-auth');

/**
 * Pre-load qrcode-terminal so rendering is synchronous when QR events fire.
 */
let qrtermModule: { generate: (qr: string, opts: { small: boolean }, cb: (output: string) => void) => void } | null = null;

async function loadQrTerminal(): Promise<void> {
  try {
    const mod = await import('qrcode-terminal');
    qrtermModule = mod.default ?? mod;
  } catch {
    // Will use fallback rendering
  }
}

/**
 * Render a QR code in the terminal synchronously.
 */
function renderQR(qr: string): void {
  if (qrtermModule) {
    qrtermModule.generate(qr, { small: true }, (output: string) => {
      console.log(output);
    });
  } else {
    console.log('\nQR Code (scan with WhatsApp):');
    console.log(qr);
    console.log('\nTip: install qrcode-terminal for a visual QR code\n');
  }
}

// ---------------------------------------------------------------------------
// Browser QR server (SSE-based)
// ---------------------------------------------------------------------------

const QR_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>relay-agent — WhatsApp Login</title>
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      background: #0a0a0a;
      color: #e0e0e0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #fff;
    }
    .subtitle {
      color: #888;
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
    #qr-canvas {
      background: #fff;
      padding: 1rem;
      border-radius: 12px;
      display: inline-block;
    }
    #qr-canvas canvas { display: block; }
    .status {
      margin-top: 1.5rem;
      font-size: 0.95rem;
      color: #888;
    }
    .status.connected {
      color: #4ade80;
      font-weight: 600;
    }
    .status.error {
      color: #f87171;
    }
    .attempt {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>relay-agent</h1>
    <p class="subtitle">Scan with WhatsApp to connect</p>
    <div id="qr-canvas"></div>
    <p id="status" class="status">Waiting for QR code...</p>
    <p id="attempt" class="attempt"></p>
  </div>
  <script>
    const container = document.getElementById('qr-canvas');
    const status = document.getElementById('status');
    const attempt = document.getElementById('attempt');
    let count = 0;

    const cvs = document.createElement('canvas');
    container.appendChild(cvs);
    const qr = new QRious({ element: cvs, size: 280, level: 'M' });

    const es = new EventSource('/events');

    es.addEventListener('qr', (e) => {
      count++;
      qr.value = e.data;
      status.textContent = 'Waiting for scan... (QR refreshes automatically)';
      status.className = 'status';
      attempt.textContent = 'attempt ' + count;
    });

    es.addEventListener('connected', () => {
      status.textContent = 'WhatsApp connected! You can close this page.';
      status.className = 'status connected';
      attempt.textContent = '';
      es.close();
    });

    es.addEventListener('error_msg', (e) => {
      status.textContent = e.data;
      status.className = 'status error';
      es.close();
    });
  </script>
</body>
</html>`;

interface QrServer {
  notify: (event: string, data: string) => void;
  close: () => void;
}

function startQrServer(port: number): QrServer {
  const clients: http.ServerResponse[] = [];
  let lastQr: string | null = null;
  let finalEvent: { event: string; data: string } | null = null;

  const server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      clients.push(res);

      // Send cached QR immediately so late-connecting clients see it
      if (finalEvent) {
        res.write(`event: ${finalEvent.event}\ndata: ${finalEvent.data}\n\n`);
      } else if (lastQr) {
        res.write(`event: qr\ndata: ${lastQr}\n\n`);
      }

      req.on('close', () => {
        const idx = clients.indexOf(res);
        if (idx !== -1) clients.splice(idx, 1);
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(QR_PAGE_HTML);
  });

  server.listen(port, '127.0.0.1');

  return {
    notify(event: string, data: string) {
      if (event === 'qr') lastQr = data;
      if (event === 'connected' || event === 'error_msg') finalEvent = { event, data };
      for (const c of clients) {
        c.write(`event: ${event}\ndata: ${data}\n\n`);
      }
    },
    close() {
      for (const c of clients) c.end();
      server.close();
    },
  };
}

// ---------------------------------------------------------------------------
// WhatsApp connection with retry
// ---------------------------------------------------------------------------

interface ConnectOptions {
  browser?: boolean;
  code?: string;
}

async function connectWithRetry(isRetry = false, opts: ConnectOptions = {}): Promise<void> {
  await loadQrTerminal();

  let qrServer: QrServer | null = null;
  const QR_PORT = 8787;

  if (opts.browser && !isRetry) {
    qrServer = startQrServer(QR_PORT);
    const url = `http://127.0.0.1:${QR_PORT}`;
    console.log(`QR page: ${url}`);
    exec(`open "${url}"`);
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const baileysLogger = pino({ level: 'silent' });

  const usePairingCode = !!opts.code;

  const sock = makeWASocket({
    auth: state,
    logger: baileysLogger as never,
    qrTimeout: usePairingCode ? undefined : 60_000,
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // Request pairing code if --code flag was used
  if (usePairingCode) {
    // Wait briefly for the socket to be ready before requesting pairing code
    setTimeout(async () => {
      try {
        const phoneNumber = opts.code!.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\nYour pairing code: ${code}\n`);
        console.log('On your phone: WhatsApp > Linked Devices > Link a Device > Link with phone number');
        console.log('Enter the code shown above.\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to request pairing code: ${msg}`);
        sock.end(undefined);
      }
    }, 3000);
  }

  return new Promise<void>((resolve, reject) => {
    let qrCount = 0;
    const timeout = setTimeout(() => {
      sock.end(undefined);
      qrServer?.notify('error_msg', 'QR code scan timed out. Run relay-agent whatsapp login to try again.');
      setTimeout(() => qrServer?.close(), 2000);
      reject(new Error('Login timed out. Run `relay-agent whatsapp login` to try again.'));
    }, 120_000);

    sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !usePairingCode) {
        qrCount++;

        // Terminal rendering
        console.clear();
        console.log(`Scan this QR code with WhatsApp (attempt ${qrCount}):\n`);
        renderQR(qr);
        if (opts.browser) {
          console.log(`\nAlso open in browser: http://127.0.0.1:${QR_PORT}`);
        }
        console.log('\nWaiting for scan... (QR refreshes automatically)');

        // Browser rendering
        qrServer?.notify('qr', qr);
      }

      if (connection === 'open') {
        clearTimeout(timeout);
        console.log('\nWhatsApp connected successfully!');
        console.log('Auth state saved. The daemon will use this on next start.');
        console.log('\nYou can now run: relay-agent start');

        qrServer?.notify('connected', '');
        setTimeout(() => {
          qrServer?.close();
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
            qrServer?.notify('error_msg', 'WhatsApp rejected authentication. Please try again later.');
            setTimeout(() => qrServer?.close(), 2000);
            reject(new Error('WhatsApp rejected authentication. Please try again later.'));
            return;
          }

          console.log('Stale session detected, clearing auth and retrying...\n');
          connectWithRetry(true, opts).then(resolve, reject);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerLoginCommand(program: Command): void {
  const whatsapp = program
    .command('whatsapp')
    .description('WhatsApp connection management');

  whatsapp
    .command('login')
    .description('Connect WhatsApp by scanning QR code or using a pairing code')
    .option('--browser', 'Open QR code in browser for easier scanning')
    .option('--code <phone>', 'Link with pairing code instead of QR (use international format, e.g. +56912345678)')
    .action(async (options: { browser?: boolean; code?: string }) => {
      const baseDir = path.resolve('.relay-agent');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      console.log('Starting WhatsApp authentication...');
      if (options.code) {
        console.log('Requesting pairing code for %s...', options.code);
      } else if (options.browser) {
        console.log('Opening QR code in browser...\n');
      } else {
        console.log('A QR code will appear below. Scan it with your WhatsApp app.');
        console.log('Tip: use --browser to open the QR in your browser instead.\n');
      }

      await connectWithRetry(false, { browser: options.browser, code: options.code });
    });

  whatsapp
    .command('logout')
    .description('Clear saved WhatsApp authentication')
    .action(() => {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        console.log('WhatsApp auth state cleared. Run `relay-agent whatsapp login` to re-authenticate.');
      } else {
        console.log('No WhatsApp auth state found.');
      }
    });

  whatsapp
    .command('status')
    .description('Check WhatsApp connection status')
    .action(async () => {
      if (!fs.existsSync(AUTH_DIR) || fs.readdirSync(AUTH_DIR).length === 0) {
        console.log('Not logged in. Run `relay-agent whatsapp login` to authenticate.');
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
            console.log('Status: Logged out (session expired). Run `relay-agent whatsapp login`.');
          } else {
            console.log('Status: Disconnected (code %d). Try `relay-agent whatsapp login`.', statusCode);
          }
        }
      });
    });
}
