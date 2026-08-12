import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

function options(argv) {
  let input;
  let project;
  let executablePath;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--input') {
      input = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--project') {
      project = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--executable-path') {
      executablePath = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unsupported argument: ${argv[index]}`);
    }
  }
  if (!input || !project) throw new Error('Usage: preflight-browser.mjs --input <outputs/index.html> --project <project-root> [--executable-path <chromium>]');
  return {
    input: resolve(input),
    project: resolve(project),
    executablePath: executablePath ? resolve(executablePath) : undefined,
  };
}

async function inspect(page, input, viewport) {
  const consoleErrors = [];
  const pageErrors = [];
  const unexpectedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      unexpectedRequests.push(url);
    }
  });
  await page.setViewportSize(viewport);
  await page.goto(pathToFileURL(input).href, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(() => window.__DASHBOARD_READY__ === true, undefined, { timeout: 30_000 });
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' || style.boxShadow !== 'none' || element.matches(':focus-visible');
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const charts = await page.evaluate(() => [...document.querySelectorAll('[data-dashboard-chart]')].map((chart) => ({
    id: chart.getAttribute('data-dashboard-chart'),
    marks: chart.querySelectorAll('svg path, svg rect, svg circle, svg polyline').length,
    minTextSize: Math.min(...[...chart.querySelectorAll('svg text')].map((text) => Number.parseFloat(getComputedStyle(text).fontSize)).filter(Number.isFinite), Infinity),
  })));
  return { consoleErrors, pageErrors, unexpectedRequests, focus, overflow, charts };
}

async function inspectPrint(page, input) {
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
  await page.goto(pathToFileURL(input).href, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(() => window.__DASHBOARD_READY__ === true, undefined, { timeout: 30_000 });
  return page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    hasPageRule: [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) => /@page/i.test(rule.cssText));
      } catch {
        return false;
      }
    }),
    printColorAdjusted: [...document.querySelectorAll('*')].some((element) => {
      const style = getComputedStyle(element);
      return style.webkitPrintColorAdjust === 'exact' || style.printColorAdjust === 'exact';
    }),
    charts: [...document.querySelectorAll('[data-dashboard-chart]')].map((chart) => ({
      id: chart.getAttribute('data-dashboard-chart'),
      marks: chart.querySelectorAll('svg path, svg rect, svg circle, svg polyline').length,
      minTextSize: Math.min(...[...chart.querySelectorAll('svg text')].map((text) => Number.parseFloat(getComputedStyle(text).fontSize)).filter(Number.isFinite), Infinity),
    })),
  }));
}

async function main() {
  const { input, project, executablePath } = options(process.argv.slice(2));
  const require = createRequire(resolve(project, 'package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const desktop = await inspect(await browser.newPage(), input, { width: 1440, height: 1000 });
    const mobilePage = await browser.newPage();
    await mobilePage.emulateMedia({ reducedMotion: 'reduce' });
    const mobile = await inspect(mobilePage, input, { width: 390, height: 844 });
    const print = await inspectPrint(await browser.newPage({ viewport: { width: 1440, height: 1000 } }), input);
    const printCharts = new Map(print.charts.map((chart) => [chart.id, chart]));
    const missingPrintSeries = desktop.charts.filter((chart) => chart.marks > 0 && (!printCharts.has(chart.id) || printCharts.get(chart.id).marks === 0));
    const smallChartText = [...desktop.charts, ...print.charts].filter((chart) => Number.isFinite(chart.minTextSize) && chart.minTextSize < 12);
    const issues = [
      ...desktop.consoleErrors,
      ...desktop.pageErrors,
      ...desktop.unexpectedRequests,
      ...mobile.consoleErrors,
      ...mobile.pageErrors,
      ...mobile.unexpectedRequests,
      ...(desktop.overflow ? ['desktop horizontal overflow'] : []),
      ...(mobile.overflow ? ['mobile horizontal overflow'] : []),
      ...(desktop.focus && mobile.focus ? [] : ['visible keyboard focus not found']),
      ...(print.horizontalOverflow ? ['print horizontal overflow'] : []),
      ...(print.hasPageRule ? [] : ['print @page rule not found']),
      ...(print.printColorAdjusted ? [] : ['print color adjustment not found']),
      ...(desktop.charts.length > 0 ? [] : ['dashboard chart containers not found']),
      ...(desktop.charts.every((chart) => chart.marks > 0) ? [] : ['screen chart SVG has insufficient rendered marks']),
      ...(missingPrintSeries.length === 0 ? [] : ['print chart SVG is missing rendered series']),
      ...(smallChartText.length === 0 ? [] : ['chart text below 12px minimum']),
    ];
    const report = { pass: issues.length === 0, checks: { desktop, mobile, print }, issues };
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (!report.pass) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ pass: false, checks: {}, issues: [error instanceof Error ? error.message : String(error)] })}\n`);
  process.exitCode = 1;
});
