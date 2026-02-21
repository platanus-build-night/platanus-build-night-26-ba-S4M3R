import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
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
          handleHttpError(res.status, res.data, 'Failed to cancel instance');
        }

        const instance = res.data;
        console.log(`Instance ${instance.id} cancelled (state: ${instance.state})`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
