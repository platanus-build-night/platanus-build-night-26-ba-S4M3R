import { Command } from 'commander';
import { stopDaemon } from '../daemon/lifecycle.js';

export function registerStopCommand(program: Command): void {
  program
    .command('stop')
    .description('Stop the Relay Agent daemon')
    .action(async () => {
      try {
        await stopDaemon();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
