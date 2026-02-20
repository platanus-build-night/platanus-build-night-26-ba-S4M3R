import { Command } from 'commander';
import readline from 'node:readline';
import { daemonRequest, handleDaemonError } from './client.js';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize Relay Agent configuration (API key, WhatsApp auth)')
    .option('--api-key <key>', 'Model API key')
    .option('--provider <provider>', 'Model provider (e.g., anthropic, openai)')
    .action(async (options: { apiKey?: string; provider?: string }) => {
      try {
        let apiKey = options.apiKey;
        let provider = options.provider;

        if (!apiKey) {
          apiKey = await prompt('Enter your model API key: ');
        }
        if (!provider) {
          provider = await prompt('Enter your model provider (anthropic, openai): ');
        }

        const res = await daemonRequest('POST', '/init', {
          model_api_key: apiKey,
          model_provider: provider,
        });

        if (res.status >= 400) {
          const errorData = res.data as { error?: string };
          console.error(`Error: ${errorData.error ?? 'Unknown error'}`);
          process.exit(1);
        }

        const data = res.data as { whatsapp_qr_displayed?: boolean };
        console.log('Configuration saved.');
        if (data.whatsapp_qr_displayed) {
          console.log('Scan the QR code displayed in the daemon to connect WhatsApp.');
        }
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
