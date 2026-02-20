import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
import type { TranscriptMessage, SendMessageRequest } from '../types.js';

export function registerSendCommand(program: Command): void {
  program
    .command('send <id> <message>')
    .description('Send a manual message in a conversation instance')
    .action(async (id: string, message: string) => {
      try {
        const body: SendMessageRequest = { message };
        const res = await daemonRequest<TranscriptMessage>(
          'POST',
          `/instances/${id}/send`,
          body,
        );

        if (res.status >= 400) {
          handleHttpError(res.status, res.data, 'Failed to send message');
        }

        const msg = res.data;
        console.log(`Message sent`);
        console.log(`  ID:        ${msg.id}`);
        console.log(`  Role:      ${msg.role}`);
        console.log(`  Timestamp: ${msg.timestamp}`);
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
