import { Command } from 'commander';
import { daemonRequest, handleDaemonError } from './client.js';
import type { TranscriptMessage } from '../types.js';

export function registerTranscriptCommand(program: Command): void {
  program
    .command('transcript <id>')
    .description('Show the message transcript for a conversation instance')
    .action(async (id: string) => {
      try {
        const res = await daemonRequest<TranscriptMessage[]>(
          'GET',
          `/instances/${id}/transcript`,
        );

        if (res.status >= 400) {
          const errorData = res.data as unknown as { error?: string };
          console.error(`Error: ${errorData.error ?? 'Failed to get transcript'}`);
          process.exit(1);
        }

        const messages = res.data;

        if (messages.length === 0) {
          console.log('No messages in transcript.');
          return;
        }

        console.log(`Transcript (${messages.length} messages)`);
        console.log('');

        for (const msg of messages) {
          const time = new Date(msg.timestamp).toLocaleString();
          const roleLabel = formatRole(msg.role);
          console.log(`[${time}] ${roleLabel}`);
          console.log(`  ${msg.content}`);
          console.log('');
        }
      } catch (err) {
        handleDaemonError(err);
      }
    });
}

function formatRole(role: string): string {
  switch (role) {
    case 'agent':
      return 'Agent';
    case 'contact':
      return 'Contact';
    case 'system':
      return 'System';
    case 'manual':
      return 'Manual';
    default:
      return role;
  }
}
