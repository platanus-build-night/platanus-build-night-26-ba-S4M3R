import { Command } from 'commander';
import { daemonRequest, handleDaemonError } from './client.js';
import type { ConversationInstance } from '../types.js';

export function registerPauseCommand(program: Command): void {
  program
    .command('pause <id>')
    .description('Pause a conversation instance')
    .action(async (id: string) => {
      try {
        const res = await daemonRequest<ConversationInstance>(
          'POST',
          `/instances/${id}/pause`,
        );

        if (res.status >= 400) {
          const errorData = res.data as unknown as { error?: string };
          console.error(`Error: ${errorData.error ?? 'Failed to pause instance'}`);
          process.exit(1);
        }

        const instance = res.data;
        console.log(`Instance ${instance.id} paused (state: ${instance.state})`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
