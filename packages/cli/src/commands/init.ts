/**
 * @module pauly init
 * @description
 * Implements the `pauly init` command.
 *
 * Scaffolds a `pauly.config.json` in the user's project root with
 * preferences for component destination path and import alias.
 *
 * ### Config File Format
 *
 * ```json
 * {
 *   "$schema": "https://paulyform.dev/schema/config.json",
 *   "componentDir": "./src/components/pauly",
 *   "importAlias": "@/components/pauly"
 * }
 * ```
 */

import { Command } from 'commander';
import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import prompts from 'prompts';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Shape of `pauly.config.json`.
 */
export interface PaulyConfig {
  /** JSON schema URL for IDE autocompletion. */
  $schema?: string;
  /** Directory where components are installed (relative to project root). */
  componentDir: string;
  /** TypeScript / bundler import alias for the component directory. */
  importAlias: string;
}

/** Default config values. */
export const DEFAULT_CONFIG: PaulyConfig = {
  $schema: 'https://paulyform.dev/schema/config.json',
  componentDir: './src/components/pauly',
  importAlias: '@/components/pauly',
};

/** Config filename — always in the project root (cwd). */
export const CONFIG_FILENAME = 'pauly.config.json';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reads `pauly.config.json` from cwd.
 * Returns `null` if the file does not exist.
 */
export async function readConfig(): Promise<PaulyConfig | null> {
  const configPath = path.resolve(process.cwd(), CONFIG_FILENAME);

  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    return (await fs.readJson(configPath)) as PaulyConfig;
  } catch {
    return null;
  }
}

// ── Command Definition ────────────────────────────────────────────────────────

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize PaulyForm configuration in your project')
    .option(
      '-y, --yes',
      'Accept all defaults without prompting',
      false
    )
    .action(async (opts: { yes: boolean }) => {
      const configPath = path.resolve(process.cwd(), CONFIG_FILENAME);

      console.log();
      console.log(
        pc.bold('🎨 PaulyForm CLI') +
        pc.dim(' — initializing project')
      );

      // ── Check for existing config ─────────────────────────────────
      if (await fs.pathExists(configPath)) {
        if (!opts.yes) {
          const { overwrite } = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: `${pc.yellow(CONFIG_FILENAME)} already exists. Overwrite?`,
            initial: false,
          });

          if (!overwrite) {
            console.log(pc.dim('  Aborted — existing config kept.'));
            process.exit(0);
          }
        }
      }

      // ── Gather preferences ────────────────────────────────────────
      let componentDir = DEFAULT_CONFIG.componentDir;
      let importAlias = DEFAULT_CONFIG.importAlias;

      if (!opts.yes) {
        const answers = await prompts([
          {
            type: 'text',
            name: 'componentDir',
            message: 'Where would you like to install components?',
            initial: DEFAULT_CONFIG.componentDir,
          },
          {
            type: 'text',
            name: 'importAlias',
            message: 'What is your import alias for components?',
            initial: DEFAULT_CONFIG.importAlias,
          },
        ]);

        // User cancelled (Ctrl+C)
        if (!answers.componentDir) {
          console.log(pc.dim('  Aborted.'));
          process.exit(0);
        }

        componentDir = answers.componentDir as string;
        importAlias = answers.importAlias as string;
      }

      // ── Write config ──────────────────────────────────────────────
      const config: PaulyConfig = {
        $schema: DEFAULT_CONFIG.$schema,
        componentDir,
        importAlias,
      };

      await fs.writeJson(configPath, config, { spaces: 2 });

      // ── Success ───────────────────────────────────────────────────
      console.log();
      console.log(pc.green(pc.bold('✔ Created ')) + pc.cyan(CONFIG_FILENAME));
      console.log();
      console.log(pc.dim('  Configuration:'));
      console.log(pc.dim(`    componentDir:  ${pc.white(componentDir)}`));
      console.log(pc.dim(`    importAlias:   ${pc.white(importAlias)}`));
      console.log();
      console.log(
        pc.dim('  Next step: ') +
        pc.white('pauly add text-input')
      );
      console.log();
    });
}
