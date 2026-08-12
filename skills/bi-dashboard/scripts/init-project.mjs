import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDirectory, '..');
const scaffoldRoot = join(skillRoot, 'scaffold');
const ignoredNames = new Set([
  'node_modules',
  'outputs',
  '.vite-cache',
  'preflight',
  '__pycache__',
]);
const requiredFiles = [
  'aggregate.py',
  'package.json',
  'package-lock.json',
  'requirements.txt',
  'vite.config.js',
  'scripts/ingest.py',
  'scripts/profile.py',
  'src/App.jsx',
  'src/Chart.jsx',
  'src/main.jsx',
  'src/styles.css',
  'data/dashboard-data.json',
  'index.html',
];

function parseArguments(argv) {
  let target;
  let installOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--target') {
      target = argv[index + 1];
      index += 1;
    } else if (value === '--install-only') {
      installOnly = true;
    } else {
      throw new Error(`Unsupported argument: ${value}`);
    }
  }
  if (!target) throw new Error('Missing required --target <project-root>.');
  return { target: resolve(target), installOnly };
}

async function hash(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function isEmptyDirectory(path) {
  if (!(await exists(path))) return true;
  return (await lstat(path)).isDirectory() && (await readdir(path)).length === 0;
}

async function copyStarter(target) {
  await mkdir(target, { recursive: true });
  await cp(scaffoldRoot, target, {
    recursive: true,
    filter: (source) => {
      const name = source.split(/[\\/]/).at(-1);
      return !ignoredNames.has(name) && !name?.endsWith('.pyc') && !name?.endsWith('.tmp');
    },
  });
  await cp(join(skillRoot, 'scripts'), join(target, 'scripts'), { recursive: true });
  await cp(join(skillRoot, 'requirements.txt'), join(target, 'requirements.txt'));
}

async function requireStarter(target) {
  for (const relativePath of requiredFiles) {
    if (!(await exists(join(target, relativePath)))) {
      throw new Error(`Dashboard starter is missing required file: ${relativePath}`);
    }
  }
  const packageJson = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  if (packageJson.name !== 'bi-dashboard-scaffold') {
    throw new Error('Target is not a BI dashboard starter project.');
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function runNpmCi(target) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(npmCommand(), ['ci', '--no-audit', '--no-fund'], {
      cwd: target,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`npm ci failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

async function requireVite(target) {
  const executable = process.platform === 'win32' ? 'vite.cmd' : 'vite';
  const vite = join(target, 'node_modules', '.bin', executable);
  try {
    const metadata = await lstat(vite);
    if (!metadata.isFile() && !metadata.isSymbolicLink()) throw new Error('not executable');
  } catch {
    throw new Error('npm ci completed but Vite is unavailable in node_modules/.bin.');
  }
}

async function main() {
  const { target, installOnly } = parseArguments(process.argv.slice(2));
  if (normalize(target) === normalize(skillRoot) || normalize(target).startsWith(`${normalize(skillRoot)}${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('Target must not be inside the installed skill directory.');
  }
  if (installOnly) {
    if (!(await exists(target))) throw new Error('Install-only mode requires an existing BI dashboard project.');
    await requireStarter(target);
  } else {
    if (!(await isEmptyDirectory(target))) {
      throw new Error('Initial setup requires a new or empty target directory; no files were changed.');
    }
    await copyStarter(target);
    await requireStarter(target);
  }

  const packagePath = join(target, 'package.json');
  const lockfilePath = join(target, 'package-lock.json');
  const packageHash = await hash(packagePath);
  const lockfileHash = await hash(lockfilePath);
  await runNpmCi(target);
  if (packageHash !== (await hash(packagePath)) || lockfileHash !== (await hash(lockfilePath))) {
    throw new Error('npm ci changed package.json or package-lock.json.');
  }
  await requireVite(target);

  process.stdout.write([
    'BI dashboard project is ready.',
    '',
    `Project: ${target}`,
    'Dependencies: installed from package-lock.json',
    'Lockfile: unchanged',
    'Vite: available',
  ].join('\n') + '\n');
}

main().catch((error) => {
  process.stderr.write(`BI dashboard initialization failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
