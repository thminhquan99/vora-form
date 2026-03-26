/**
 * @module pauly add
 * @description
 * Implements the `pauly add <component>` command.
 *
 * ### Config-Aware Resolution
 *
 * 1. Reads `pauly.config.json` (if present) for `componentDir`.
 * 2. `--dest` CLI flag always overrides config.
 * 3. Falls back to `./src/components/pauly` if neither exists.
 * 4. Warns when no config file is found.
 *
 * ### Flow
 *
 * 1. Resolve the component folder in `registry/<name>`.
 * 2. Read and parse `component.json` (manifest).
 * 3. Determine destination from config → `--dest` → default.
 * 4. For each file in `component.json.files`:
 *    a. If the file already exists at the destination → prompt overwrite.
 *    b. Copy the file.
 * 5. Recursively process `registryDependencies` (e.g., `label`, `field-error`).
 * 6. Report which npm dependencies the user should install.
 */

import { Command } from 'commander';
import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import prompts from 'prompts';
import { fileURLToPath } from 'node:url';
import { readConfig, CONFIG_FILENAME, DEFAULT_CONFIG } from './init.js';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Shape of a registry `component.json` manifest.
 */
interface ComponentManifest {
  name: string;
  category: string;
  files: string[];
  npmDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  registryDependencies: string[];
  versionRange: string;
  browserOnly: boolean;
  tags: string[];
  exports: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the default registry path (monorepo `registry/` folder).
 *
 * tsup bundles everything into `dist/index.js`, so `__dirname` is
 * `packages/cli/dist/`. We need to go 3 levels up to reach the
 * monorepo root, then into `registry/`.
 *
 * Falls back to 4 levels up (for running source directly via tsx).
 */
function getDefaultRegistryPath(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Bundled: packages/cli/dist/index.js → ../../../registry
  const bundledPath = path.resolve(__dirname, '..', '..', '..', 'registry');
  if (fs.pathExistsSync(bundledPath)) return bundledPath;

  // Source (tsx/ts-node): packages/cli/src/commands/add.ts → ../../../../registry
  const sourcePath = path.resolve(__dirname, '..', '..', '..', '..', 'registry');
  if (fs.pathExistsSync(sourcePath)) return sourcePath;

  // Default fallback — return bundled path (will error with helpful message)
  return bundledPath;
}

/**
 * Reads and validates a `component.json` manifest.
 */
async function readManifest(
  registryPath: string,
  componentName: string
): Promise<ComponentManifest> {
  const componentDir = path.join(registryPath, componentName);

  if (!(await fs.pathExists(componentDir))) {
    console.error(
      pc.red(`✖ Component "${componentName}" not found in registry.`)
    );
    console.error(
      pc.dim(`  Looked in: ${componentDir}`)
    );
    process.exit(1);
  }

  const manifestPath = path.join(componentDir, 'component.json');

  if (!(await fs.pathExists(manifestPath))) {
    console.error(
      pc.red(`✖ No component.json found for "${componentName}".`)
    );
    console.error(
      pc.dim(`  Expected: ${manifestPath}`)
    );
    process.exit(1);
  }

  return fs.readJson(manifestPath) as Promise<ComponentManifest>;
}

// ── Core Logic ────────────────────────────────────────────────────────────────

/**
 * Track which components have already been processed in this session
 * to avoid infinite loops with circular dependencies.
 */
const processed = new Set<string>();

/**
 * Accumulates all npm dependencies across all copied components
 * so we can print a single `pnpm add` command at the end.
 */
const allNpmDeps: Record<string, string> = {};

/**
 * Copies a single registry component into the user's project.
 *
 * @param componentName  - Registry folder name (e.g., "text-input")
 * @param registryPath   - Absolute path to the `registry/` folder
 * @param destBase       - Absolute path to the destination base dir
 * @param overwriteAll   - If true, skip overwrite prompts (--yes flag)
 */
async function copyComponent(
  componentName: string,
  registryPath: string,
  destBase: string,
  overwriteAll: boolean
): Promise<void> {
  // ── Guard: already processed ────────────────────────────────────────
  if (processed.has(componentName)) return;
  processed.add(componentName);

  console.log();
  console.log(pc.cyan(`◆ Adding ${pc.bold(componentName)}...`));

  // ── Read manifest ───────────────────────────────────────────────────
  const manifest = await readManifest(registryPath, componentName);
  const sourceDir = path.join(registryPath, componentName);
  const destDir = path.join(destBase, componentName);

  // ── FIX 8: Guard against path traversal in manifest file entries ───
  for (const file of manifest.files) {
    const resolvedSrc = path.resolve(sourceDir, file);
    const resolvedDst = path.resolve(destDir, file);
    if (!resolvedSrc.startsWith(sourceDir)) {
      console.error(pc.red(`✖ Suspicious file path in manifest: "${file}". Aborting.`));
      process.exit(1);
    }
    if (!resolvedDst.startsWith(destDir)) {
      console.error(pc.red(`✖ Suspicious file path in manifest: "${file}". Aborting.`));
      process.exit(1);
    }
  }

  // ── Copy files ──────────────────────────────────────────────────────
  await fs.ensureDir(destDir);

  for (const file of manifest.files) {
    const srcFile = path.join(sourceDir, file);
    const dstFile = path.join(destDir, file);

    // Check if file exists and prompt for overwrite
    if (await fs.pathExists(dstFile)) {
      if (!overwriteAll) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `${pc.yellow(file)} already exists. Overwrite?`,
          initial: false,
        });

        if (!overwrite) {
          console.log(pc.dim(`  ⏭ Skipped ${file}`));
          continue;
        }
      }
    }

    await fs.copy(srcFile, dstFile, { overwrite: true });
    console.log(pc.green(`  ✔ ${file}`));
  }

  // ── Accumulate npm deps ─────────────────────────────────────────────
  if (manifest.npmDependencies) {
    for (const [dep, version] of Object.entries(manifest.npmDependencies)) {
      allNpmDeps[dep] = version;
    }
  }

  // ── Recursively add registry dependencies ───────────────────────────
  if (manifest.registryDependencies?.length) {
    console.log(
      pc.dim(
        `  ↳ Resolving ${manifest.registryDependencies.length} ` +
        `dependenc${manifest.registryDependencies.length === 1 ? 'y' : 'ies'}: ` +
        manifest.registryDependencies.join(', ')
      )
    );

    for (const dep of manifest.registryDependencies) {
      await copyComponent(dep, registryPath, destBase, overwriteAll);
    }
  }
}

// ── Command Definition ────────────────────────────────────────────────────────

export function addCommand(program: Command): void {
  program
    .command('add')
    .description('Add a VoraForm component to your project')
    .argument('<components...>', 'Component name(s) to add (e.g., text-input checkbox)')
    .option(
      '-d, --dest <path>',
      'Destination directory for copied components',
    )
    .option(
      '-r, --registry-path <path>',
      'Path to the local registry folder (dev mode)',
    )
    .option(
      '-y, --yes',
      'Skip overwrite prompts (overwrite all)',
      false
    )
    .action(async (
      components: string[],
      opts: { dest?: string; registryPath?: string; yes: boolean }
    ) => {
      const registryPath = opts.registryPath
        ? path.resolve(opts.registryPath)
        : getDefaultRegistryPath();

      // ── Resolve destination from config → --dest → default ────────
      const config = await readConfig();
      let destBase: string;
      let configSource: 'flag' | 'config' | 'default';

      if (opts.dest) {
        // CLI flag always wins
        destBase = path.resolve(opts.dest);
        configSource = 'flag';
      } else if (config?.componentDir) {
        // Read from pauly.config.json
        destBase = path.resolve(config.componentDir);
        configSource = 'config';
      } else {
        // Fallback to default
        destBase = path.resolve(DEFAULT_CONFIG.componentDir);
        configSource = 'default';
      }

      // Warn if no config file found
      if (!config) {
        console.log();
        console.log(
          pc.yellow('⚠ No ') +
          pc.yellow(pc.bold(CONFIG_FILENAME)) +
          pc.yellow(' found. Using default destination.')
        );
        console.log(
          pc.dim(`  Run ${pc.white('pauly init')} to configure.`)
        );
      }

      // ── Validate registry path exists ─────────────────────────────
      if (!(await fs.pathExists(registryPath))) {
        console.error(
          pc.red('✖ Registry path not found:'),
          pc.dim(registryPath)
        );
        console.error(
          pc.yellow(
            '  Use --registry-path <path> to specify the registry location.'
          )
        );
        process.exit(1);
      }

      // ── Banner ────────────────────────────────────────────────────
      console.log();
      console.log(
        pc.bold('🎨 VoraForm CLI') +
        pc.dim(' — adding components')
      );
      console.log(pc.dim(`   Registry:    ${registryPath}`));
      console.log(pc.dim(`   Destination: ${destBase}`));

      // ── Process each requested component ──────────────────────────
      for (const name of components) {
        await copyComponent(name, registryPath, destBase, opts.yes);
      }

      // ── Summary ───────────────────────────────────────────────────
      console.log();
      console.log(
        pc.green(pc.bold('✔ Done!')) +
        ` Added ${pc.bold(String(processed.size))} component${processed.size !== 1 ? 's' : ''}.`
      );

      // List what was added
      console.log(
        pc.dim('  Components: ') +
        [...processed].map((c) => pc.cyan(c)).join(', ')
      );

      // npm deps reminder
      const depEntries = Object.entries(allNpmDeps);
      if (depEntries.length > 0) {
        console.log();
        console.log(pc.yellow('⚠ Install required npm dependencies:'));
        console.log(
          pc.dim('  pnpm add ') +
          depEntries.map(([name, ver]) => `${name}@${ver}`).join(' ')
        );
      }

      // Peer deps reminder (always needed)
      console.log();
      console.log(pc.dim('📦 Ensure these peer dependencies are installed:'));
      console.log(pc.dim('  pnpm add react react-dom @vora/core'));
      console.log();
    });
}
