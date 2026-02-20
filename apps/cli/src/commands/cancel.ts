import { Command } from 'commander';
import { daemonRequest, handleDaemonError } from './client.js';
import type { ConversationInstance } from '../types.js';

export function registerCancelCommand(program: Command): void {
  program
    .command('cancel <id>')
    .description('Cancel a conversation instance')
    .action(async (id: string) => {
      try {
        const res = await daemonRequest<ConversationInstance>(
          'POST',
          `/instances/${id}/cancel`,
        );

        if (res.status >= 400) {
          const errorData = res.data as unknown as { error?: string };
          console.error(`Error: ${errorData.error ?? 'Failed to cancel instance'}`);
          process.exit(1);
        }

        const instance = res.data;
        console.log(`Instance ${instance.id} cancelled (state: ${instance.state})`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
