#!/usr/bin/env node

import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerStartCommand } from './commands/start.js';
import { registerStopCommand } from './commands/stop.js';
import { registerStatusCommand } from './commands/status.js';
import { registerCreateCommand } from './commands/create.js';
import { registerListCommand } from './commands/list.js';
import { registerGetCommand } from './commands/get.js';
import { registerTranscriptCommand } from './commands/transcript.js';
import { registerCancelCommand } from './commands/cancel.js';
import { registerPauseCommand } from './commands/pause.js';
import { registerResumeCommand } from './commands/resume.js';
import { registerSendCommand } from './commands/send.js';
import { registerLoginCommand } from './commands/login.js';
import { registerConfigCommand } from './commands/config.js';

const program = new Command();

program
  .name('relay')
  .description('Relay Agent CLI - Manage AI-powered WhatsApp conversations')
  .version('0.1.0');

registerInitCommand(program);
registerStartCommand(program);
registerStopCommand(program);
registerStatusCommand(program);
registerCreateCommand(program);
registerListCommand(program);
registerGetCommand(program);
registerTranscriptCommand(program);
registerCancelCommand(program);
registerPauseCommand(program);
registerResumeCommand(program);
registerSendCommand(program);
registerLoginCommand(program);
registerConfigCommand(program);

program.parse();
