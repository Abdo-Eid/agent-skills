import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

function inputPath(argv) {
  if (argv.length !== 2 || argv[0] !== '--input') {
    throw new Error('Usage: validate-output.mjs --input <outputs/index.html>');
  }
  return resolve(argv[1]);
}

async function main() {
  const input = inputPath(process.argv.slice(2));
  const details = await stat(input);
  const html = await readFile(input, 'utf8');
  const checks = [
    ['non-empty-html', details.size > 0],
    ['document-root', /<div\b[^>]*\bid=["']app["'][^>]*>/i.test(html)],
    ['readiness-marker', /__DASHBOARD_READY__/i.test(html)],
    ['no-placeholders', !/(lorem ipsum|TODO_PLACEHOLDER|\{\{[^}]+\}\})/i.test(html)],
    ['no-remote-assets', !/(?:src|href)\s*=\s*["']https?:\/\/|url\(\s*["']?https?:\/\//i.test(html)],
    ['no-obvious-runtime-endpoints', !/\bfetch\s*\(\s*["'](?:https?:\/\/|\/api\/|data\/)|\b(?:window|globalThis)\.fetch\s*\(|new\s+XMLHttpRequest\s*\(|new\s+WebSocket\s*\(/i.test(html)],
  ];
  const issues = checks.filter(([, pass]) => !pass).map(([name]) => name);
  const report = { pass: issues.length === 0, checks: Object.fromEntries(checks), issues };
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ pass: false, checks: {}, issues: [error instanceof Error ? error.message : String(error)] })}\n`);
  process.exitCode = 1;
});
