import { Command } from 'commander';
import { Bot } from 'grammy';
import {
  saveToken,
  removeToken,
  getSavedToken,
  hasAuthState,
} from '../telegram/connection.js';

export function registerTelegramLoginCommand(program: Command): void {
  const telegram = program
    .command('telegram')
    .description('Telegram bot connection management');

  telegram
    .command('login')
    .description('Connect a Telegram bot by providing a bot token from @BotFather')
    .requiredOption('--token <token>', 'Telegram bot token from @BotFather')
    .action(async (options: { token: string }) => {
      const { token } = options;

      console.log('Verifying Telegram bot token...');

      try {
        const testBot = new Bot(token);
        const me = await testBot.api.getMe();

        console.log(`\nBot verified successfully!`);
        console.log(`  Username: @${me.username}`);
        console.log(`  Name:     ${me.first_name}${me.last_name ? ` ${me.last_name}` : ''}`);

        saveToken(token);
        console.log('\nToken saved. The daemon will use this on next start.');
        console.log('You can now run: relay-agent start');
        console.log(`\nUsers should message @${me.username} on Telegram to start interacting.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`\nFailed to verify bot token: ${message}`);
        console.error('Make sure the token is correct. Get one from @BotFather on Telegram.');
        process.exit(1);
      }
    });

  telegram
    .command('logout')
    .description('Clear saved Telegram bot token')
    .action(() => {
      if (hasAuthState()) {
        removeToken();
        console.log('Telegram bot token cleared. Run `relay-agent telegram login` to re-authenticate.');
      } else {
        console.log('No Telegram bot token found.');
      }
    });

  telegram
    .command('status')
    .description('Check Telegram bot status')
    .action(async () => {
      const token = getSavedToken();

      if (!token) {
        console.log('Not configured. Run `relay-agent telegram login --token <TOKEN>` to set up.');
        return;
      }

      console.log('Bot token found. Checking connection...\n');

      try {
        const testBot = new Bot(token);
        const me = await testBot.api.getMe();

        console.log('Status:   Connected');
        console.log(`Username: @${me.username}`);
        console.log(`Name:     ${me.first_name}${me.last_name ? ` ${me.last_name}` : ''}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.log(`Status: Error — ${message}`);
        console.log('Try `relay-agent telegram login --token <TOKEN>` to reconfigure.');
      }
    });
}
