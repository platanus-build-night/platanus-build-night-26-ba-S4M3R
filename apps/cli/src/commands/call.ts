import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';

interface CallResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  agent_id: string;
  callSid?: string;
}

export function registerCallCommand(program: Command): void {
  program
    .command('call <phone>')
    .description('Place an outbound call via ElevenLabs (creates a temporary agent)')
    .requiredOption('--phone-number-id <id>', 'ElevenLabs agent phone number ID (Twilio)')
    .requiredOption('--prompt <text>', 'System prompt for the call agent')
    .requiredOption('--first-message <text>', 'First message the agent says when the call connects')
    .option('--api-key <key>', 'ElevenLabs API key (or set ELEVENLABS_API_KEY env var)')
    .option('--voice-id <id>', 'ElevenLabs voice ID (defaults to Rachel)')
    .option('--language <lang>', 'Language code (default: en)', 'en')
    .action(async (phone: string, options: {
      phoneNumberId: string;
      prompt: string;
      firstMessage: string;
      apiKey?: string;
      voiceId?: string;
      language: string;
    }) => {
      try {
        const apiKey = options.apiKey ?? process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          console.error('Error: ElevenLabs API key required. Use --api-key or set ELEVENLABS_API_KEY env var.');
          process.exit(1);
        }

        const body = {
          to_number: phone,
          phone_number_id: options.phoneNumberId,
          prompt: options.prompt,
          first_message: options.firstMessage,
          elevenlabs_api_key: apiKey,
          voice_id: options.voiceId,
          language: options.language,
        };

        const res = await daemonRequest<CallResponse>('POST', '/call', body);

        if (res.status >= 400) {
          handleHttpError(res.status, res.data, 'Failed to place call');
        }

        console.log('Call initiated');
        console.log(`  Agent ID:        ${res.data.agent_id}`);
        console.log(`  Conversation ID: ${res.data.conversation_id}`);
        if (res.data.callSid) {
          console.log(`  Call SID:        ${res.data.callSid}`);
        }
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
