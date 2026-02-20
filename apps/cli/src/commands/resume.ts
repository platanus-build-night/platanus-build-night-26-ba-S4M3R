import { Command } from 'commander';
import { daemonRequest, handleDaemonError } from './client.js';
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
          const errorData = res.data as unknown as { error?: string };
          console.error(`Error: ${errorData.error ?? 'Failed to resume instance'}`);
          process.exit(1);
        }

        const instance = res.data;
        console.log(`Instance ${instance.id} resumed (state: ${instance.state})`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
