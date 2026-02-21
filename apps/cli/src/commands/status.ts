import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
import type { DaemonStatusResponse } from '../types.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show daemon and WhatsApp connection status')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      try {
        const res = await daemonRequest<DaemonStatusResponse>('GET', '/status');

        if (res.status >= 400) {
          handleHttpError(res.status, res.data, 'Failed to get status');
        }

        const data = res.data;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        console.log('Relay Agent Status');
        console.log('------------------');
        console.log(`  PID:                  ${data.pid}`);
        console.log(`  Uptime:               ${formatUptime(data.uptime_seconds)}`);
        console.log(`  WhatsApp Connected:   ${data.whatsapp_connected ? 'Yes' : 'No'}`);
        console.log(`  Active Instances:     ${data.active_instance_count}`);
        console.log(`  Total Instances:      ${data.total_instance_count}`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
