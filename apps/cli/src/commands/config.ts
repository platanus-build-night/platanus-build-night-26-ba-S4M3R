import path from 'node:path';
import { Command } from 'commander';
import { daemonRequest, handleDaemonError, handleHttpError } from './client.js';
import type { RelayConfig } from '../types.js';

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Show agent configuration file paths')
    .action(async () => {
      try {
        const res = await daemonRequest<{ config: RelayConfig }>('GET', '/config');

        if (res.status >= 400) {
          handleHttpError(res.status, res.data, 'Failed to get config');
        }

        const config = res.data.config;

        console.log('Agent Configuration');
        console.log('───────────────────────────────────────');
        console.log(`  Identity file:  ${config.identity_file}`);
        console.log(`  Soul file:      ${config.soul_file}`);
        console.log(`  Config store:   ${path.resolve('.relay-agent', 'config.json')}`);
        console.log('');
        console.log('Edit IDENTITY.md to define who your agent is.');
        console.log('Edit SOUL.md to define how your agent behaves.');
      } catch (err) {
        handleDaemonError(err);
      }
    });
}
