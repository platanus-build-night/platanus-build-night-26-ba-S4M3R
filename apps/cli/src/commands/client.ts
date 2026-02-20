import http from 'node:http';

const DAEMON_HOST = '127.0.0.1';
const DAEMON_PORT = 3214;
const BASE_URL = `http://${DAEMON_HOST}:${DAEMON_PORT}`;

export interface DaemonResponse<T = unknown> {
  status: number;
  data: T;
}

/**
 * Makes an HTTP request to the daemon API.
 * Catches connection refused errors and displays a helpful message.
 */
export async function daemonRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<DaemonResponse<T>> {
  const url = `${BASE_URL}${path}`;

  return new Promise<DaemonResponse<T>>((resolve, reject) => {
    const urlObj = new URL(url);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(payload !== undefined ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        timeout: 10_000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          try {
            const parsed = data.length > 0 ? JSON.parse(data) : {};
            resolve({ status: res.statusCode ?? 500, data: parsed as T });
          } catch {
            resolve({ status: res.statusCode ?? 500, data: data as unknown as T });
          }
        });
      },
    );

    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new DaemonNotRunningError());
      } else {
        reject(err);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request to daemon timed out'));
    });

    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Custom error class for when the daemon is not running.
 */
export class DaemonNotRunningError extends Error {
  constructor() {
    super('Daemon not running. Run `relay start` first.');
    this.name = 'DaemonNotRunningError';
  }
}

/**
 * Handles errors from daemon requests.
 * Prints a user-friendly message to stderr and exits with code 1.
 */
export function handleDaemonError(err: unknown): never {
  if (err instanceof DaemonNotRunningError) {
    console.error(err.message);
  } else if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error('An unexpected error occurred');
  }
  process.exit(1);
}
