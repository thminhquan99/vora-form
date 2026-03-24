#!/usr/bin/env node

/**
 * @module @vora/cli
 * @description
 * Entry point for the `pauly` CLI.
 *
 * ### Available Commands
 *
 * ```sh
 * pauly init              # Initialize VoraForm config (pauly.config.json)
 * pauly add <component>   # Copy a registry component into your project
 * ```
 *
 * ### Monorepo Dev Mode
 *
 * During development, the CLI resolves the `registry/` path relative
 * to the monorepo root. In production (published to npm), this will
 * be replaced with a remote registry fetch or a bundled local copy.
 */

import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('pauly')
  .description('VoraForm CLI — copy registry components into your project')
  .version('0.1.0');

// ── Commands ──────────────────────────────────────────────────────────────────

initCommand(program);
addCommand(program);

// ── Parse ─────────────────────────────────────────────────────────────────────

program.parse();
