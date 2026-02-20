import { Command } from 'commander';
import { daemonRequest, handleDaemonError } from './client.js';
import type { CreateInstanceRequest, CreateInstanceResponse } from '../types.js';

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Create a new conversation instance')
    .requiredOption('--objective <text>', 'Conversation objective')
    .requiredOption('--contact <phone>', 'Target contact phone number (international format)')
    .requiredOption('--todos <items>', 'Comma-separated list of todo items')
    .option('--heartbeat-interval <ms>', 'Heartbeat interval in milliseconds', parseInt)
    .option('--max-followups <n>', 'Maximum number of follow-ups', parseInt)
    .action(
      async (options: {
        objective: string;
        contact: string;
        todos: string;
        heartbeatInterval?: number;
        maxFollowups?: number;
      }) => {
        try {
          const todos = options.todos
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .map((text) => ({ text }));

          if (todos.length === 0) {
            console.error('Error: At least one todo item is required');
            process.exit(1);
          }

          const body: CreateInstanceRequest = {
            objective: options.objective,
            target_contact: options.contact,
            todos,
          };

          if (options.heartbeatInterval !== undefined || options.maxFollowups !== undefined) {
            body.heartbeat_config = {};
            if (options.heartbeatInterval !== undefined) {
              body.heartbeat_config.interval_ms = options.heartbeatInterval;
            }
            if (options.maxFollowups !== undefined) {
              body.heartbeat_config.max_followups = options.maxFollowups;
            }
          }

          const res = await daemonRequest<CreateInstanceResponse>('POST', '/instances', body);

          if (res.status >= 400) {
            const errorData = res.data as unknown as { error?: string };
            console.error(`Error: ${errorData.error ?? 'Failed to create instance'}`);
            process.exit(1);
          }

          const data = res.data;
          console.log(`Instance created`);
          console.log(`  ID:    ${data.id}`);
          console.log(`  State: ${data.state}`);
        } catch (err) {
          handleDaemonError(err);
        }
      },
    );
}
