import { Command } from 'commander';
import { startDaemon } from '../daemon/lifecycle.js';

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start the Relay Agent daemon')
    .action(async () => {
      try {
        await startDaemon();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
