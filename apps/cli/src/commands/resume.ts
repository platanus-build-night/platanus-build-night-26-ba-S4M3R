import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
import type { ConversationInstance } from '../types.js';

export function registerResumeCommand(program: Command): void {
  program
    .command('resume <id>')
    .description('Resume a paused conversation instance')
    .action(async (id: string) => {
      try {
        const res = await daemonRequest<ConversationInstance>(
          'POST',
          `/instances/${id}/resume`,
        );

        if (res.status >= 400) {
          handleHttpError(res.status, res.data, 'Failed to resume instance');
        }

        const instance = res.data;
        console.log(`Instance ${instance.id} resumed (state: ${instance.state})`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
