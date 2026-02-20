import { Command } from 'commander';
import { daemonRequest, handleDaemonError } from './client.js';
import type { ConversationInstance } from '../types.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List all conversation instances')
    .action(async () => {
      try {
        const res = await daemonRequest<ConversationInstance[]>('GET', '/instances');

        if (res.status >= 400) {
          const errorData = res.data as unknown as { error?: string };
          console.error(`Error: ${errorData.error ?? 'Failed to list instances'}`);
          process.exit(1);
        }

        const instances = res.data;

        if (instances.length === 0) {
          console.log('No instances found.');
          return;
        }

        // Table header
        const idWidth = 36;
        const stateWidth = 26;
        const contactWidth = 20;
        const objectiveWidth = 40;

        const header = [
          'ID'.padEnd(idWidth),
          'State'.padEnd(stateWidth),
          'Contact'.padEnd(contactWidth),
          'Objective'.padEnd(objectiveWidth),
        ].join('  ');

        const separator = '-'.repeat(header.length);

        console.log(header);
        console.log(separator);

        for (const instance of instances) {
          const objective =
            instance.objective.length > objectiveWidth
              ? instance.objective.substring(0, objectiveWidth - 3) + '...'
              : instance.objective;

          const row = [
            instance.id.padEnd(idWidth),
            instance.state.padEnd(stateWidth),
            instance.target_contact.padEnd(contactWidth),
            objective.padEnd(objectiveWidth),
          ].join('  ');

          console.log(row);
        }

        console.log(`\n${instances.length} instance(s) total`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
