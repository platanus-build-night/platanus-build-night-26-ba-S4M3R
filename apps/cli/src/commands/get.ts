import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
import type { ConversationInstance } from '../types.js';

export function registerGetCommand(program: Command): void {
  program
    .command('get <id>')
    .description('Get detailed information about a conversation instance')
    .action(async (id: string) => {
      try {
        const res = await daemonRequest<ConversationInstance>('GET', `/instances/${id}`);

        if (res.status >= 400) {
          handleHttpError(res.status, res.data, `Instance ${id} not found`);
        }

        const instance = res.data;

        console.log('Instance Details');
        console.log('----------------');
        console.log(`  ID:              ${instance.id}`);
        console.log(`  State:           ${instance.state}`);
        console.log(`  Objective:       ${instance.objective}`);
        console.log(`  Contact:         ${instance.target_contact}`);
        console.log(`  Follow-ups:      ${instance.follow_up_count}`);
        console.log(`  Created:         ${instance.created_at}`);
        console.log(`  Updated:         ${instance.updated_at}`);

        if (instance.previous_state) {
          console.log(`  Previous State:  ${instance.previous_state}`);
        }
        if (instance.failure_reason) {
          console.log(`  Failure Reason:  ${instance.failure_reason}`);
        }

        console.log('');
        console.log('  Heartbeat Config:');
        console.log(`    Interval:      ${instance.heartbeat_config.interval_ms}ms`);
        console.log(`    Max Follow-ups: ${instance.heartbeat_config.max_followups}`);

        console.log('');
        console.log('  Todos:');
        if (instance.todos.length === 0) {
          console.log('    (none)');
        } else {
          for (const todo of instance.todos) {
            const statusIcon =
              todo.status === 'completed'
                ? '[x]'
                : todo.status === 'in_progress'
                  ? '[~]'
                  : todo.status === 'skipped'
                    ? '[-]'
                    : '[ ]';
            console.log(`    ${statusIcon} ${todo.text} (${todo.status})`);
          }
        }
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
