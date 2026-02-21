import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
import type { CreateInstanceRequest, CreateInstanceResponse } from '../types.js';

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Create a new conversation instance (WhatsApp, Telegram, or phone call)')
    .requiredOption('--objective <text>', 'Conversation objective')
    .requiredOption('--contact <phone>', 'Target contact phone number (international format)')
    .requiredOption('--todos <items>', 'Comma-separated list of todo items')
    .option('--channel <type>', 'Channel: "whatsapp", "telegram", or "phone" (default: whatsapp)', 'whatsapp')
    .option('--telegram-chat-id <id>', 'Telegram chat ID (for telegram channel, if known)')
    .option('--heartbeat-interval <ms>', 'Heartbeat interval in milliseconds', parseInt)
    .option('--max-followups <n>', 'Maximum number of follow-ups', parseInt)
    .option('--phone-number-id <id>', 'ElevenLabs phone number ID (required for phone channel)')
    .option('--first-message <text>', 'First message for phone call agent')
    .option('--voice-id <id>', 'ElevenLabs voice ID (phone channel)')
    .option('--language <lang>', 'Language code for phone call (default: en)')
    .option('--elevenlabs-api-key <key>', 'ElevenLabs API key (or ELEVENLABS_API_KEY env var)')
    .action(
      async (options: {
        objective: string;
        contact: string;
        todos: string;
        channel: string;
        telegramChatId?: string;
        heartbeatInterval?: number;
        maxFollowups?: number;
        phoneNumberId?: string;
        firstMessage?: string;
        voiceId?: string;
        language?: string;
        elevenlabsApiKey?: string;
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

          const channel = options.channel as 'whatsapp' | 'phone' | 'telegram';

          if (channel === 'phone') {
            const apiKey = options.elevenlabsApiKey ?? process.env.ELEVENLABS_API_KEY;
            if (!apiKey) {
              console.error('Error: ElevenLabs API key required for phone channel. Use --elevenlabs-api-key or set ELEVENLABS_API_KEY env var.');
              process.exit(1);
            }
            if (!options.phoneNumberId) {
              console.error('Error: --phone-number-id is required for phone channel');
              process.exit(1);
            }
            if (!options.firstMessage) {
              console.error('Error: --first-message is required for phone channel');
              process.exit(1);
            }
          }

          const body: CreateInstanceRequest = {
            objective: options.objective,
            target_contact: options.contact,
            todos,
            channel,
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

          if (channel === 'telegram' && options.telegramChatId) {
            (body as unknown as Record<string, unknown>).telegram_chat_id = options.telegramChatId;
          }

          if (channel === 'phone') {
            body.phone_config = {
              elevenlabs_api_key: (options.elevenlabsApiKey ?? process.env.ELEVENLABS_API_KEY)!,
              phone_number_id: options.phoneNumberId!,
              first_message: options.firstMessage!,
              voice_id: options.voiceId,
              language: options.language,
            };
          }

          const res = await daemonRequest<CreateInstanceResponse>('POST', '/instances', body);

          if (res.status >= 400) {
            handleHttpError(res.status, res.data, 'Failed to create instance');
          }

          const data = res.data;
          console.log(`Instance created`);
          console.log(`  ID:      ${data.id}`);
          console.log(`  State:   ${data.state}`);
          console.log(`  Channel: ${channel}`);
        } catch (err) {
          handleDaemonError(err);
        }
      },
    );
}
