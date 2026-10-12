// SPDX-License-Identifier: Apache-2.0
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const shard = process.argv[2];
if (!/^\d+\/\d+$/.test(shard ?? '')) throw new Error('Provide a Playwright shard, e.g. 3/16');
const directory = mkdtempSync(join(tmpdir(), 'gza-e2e-'));
const enumeration = join(directory, 'enumeration.json');
const performance = process.argv.includes('--performance');
const diagnosticGrep = process.argv.find(value => value.startsWith('--grep='))?.slice(7);
const listed = spawnSync('pnpm', [performance ? 'test:performance' : 'test:e2e', '--fully-parallel', `--shard=${shard}`, '--list', '--reporter=json',
  ...(diagnosticGrep ? ['--grep', diagnosticGrep] : [])], {
  stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: enumeration },
});
if (listed.error || listed.status !== 0) throw listed.error ?? new Error('Cannot enumerate the complete source E2E suite');

function descriptions(report) {
  const tests = [];
  function visit(suite, titles) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests) {
      tests.push(`[${test.projectName}] › ${spec.file} › ${[...titles, spec.title].join(' › ')}`);
    }
    for (const nested of suite.suites ?? []) visit(nested, [...titles, nested.title]);
  }
  for (const file of report.suites) visit(file, []);
  return tests;
}

const tests = descriptions(JSON.parse(readFileSync(enumeration, 'utf8')));
if (!tests.length || new Set(tests).size !== tests.length) throw new Error('Empty or duplicate test selection');
if (tests.some(title => title !== title.trim())) throw new Error('Test titles must not end in whitespace');
writeFileSync(join(directory, 'manifest.json'), JSON.stringify(tests, null, 2));
const needs = {
  play: tests.some(title => title.includes('cloud-coop.spec.ts › two authenticated browsers')),
  delivery: tests.some(title => title.includes('coop-delivery.spec.ts › two real clients collect')),
  production: tests.some(title => title.includes('city-coop.spec.ts ›') && title.includes('production')),
  cityInput: tests.some(title => title.includes('city-coop.spec.ts ›') && /four real city clients|four-player city HUD/.test(title)),
};
console.log(`Shard ${shard}: ${tests.length} tests, each with a fresh browser process`);
if (process.argv.includes('--plan')) {
  if (!process.env.GITHUB_OUTPUT) throw new Error('The plan requires GITHUB_OUTPUT');
  for (const [key, value] of Object.entries(needs)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  process.exit(0);
}
if (process.argv.includes('--list')) {
  console.log(JSON.stringify(tests));
  process.exit(0);
}

// Keep one owned Vite process warm while each test still gets fresh Chromium.
// Fixture authorities are real local servers; no production account is used.
const servers = [];
const runEnv = { ...process.env };
if (needs.play) {
  runEnv.PLAY_COOP_FIXTURE_URL ??= 'http://127.0.0.1:43177';
  // The real SDK obtains Colyseus connections from its build-time API origin.
  runEnv.VITE_YLF_COMPETITION_API_ORIGIN = runEnv.PLAY_COOP_FIXTURE_URL;
}
async function startServer(name, command, args, url, options = {}) {
  const log = openSync(join(directory, `${name}.log`), 'w');
  const child = spawn(command, args, { cwd: options.cwd, env: { ...runEnv, ...options.env },
    detached: true, stdio: ['ignore', log, log] });
  closeSync(log); servers.push(child);
  child.on('error', error => console.error(`${name}: ${error.message}`));
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2_000) })).ok) return; } catch { /* Wait for the owned listener. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`${name} did not start; inspect ${join(directory, `${name}.log`)}`);
}
let stopped = false;
function stopServers() {
  if (stopped) return;
  stopped = true;
  for (const child of servers.reverse()) try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopServers(); process.exit(1); });
process.once('exit', stopServers);
if (!performance && !runEnv.PLAYWRIGHT_BASE_URL) {
  runEnv.PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:43173';
  await startServer('vite', 'node', ['apps/dayun-kicker/node_modules/vite/bin/vite.js', 'apps/dayun-kicker',
    '--host', '127.0.0.1', '--port', '43173', '--strictPort'], runEnv.PLAYWRIGHT_BASE_URL);
}
if (needs.play && !process.env.PLAY_COOP_FIXTURE_URL) {
  if (!runEnv.PLAY_SOURCE_DIRECTORY) throw new Error('This shard requires the pinned private Play authority');
  runEnv.PLAY_COOP_FIXTURE_URL = 'http://127.0.0.1:43177';
  await startServer('play-authority', 'pnpm', ['--filter', '@yunlefun/play-game-server', 'exec', 'tsx',
    '../../scripts/dev-dayun-coop-fixture.ts'], `${runEnv.PLAY_COOP_FIXTURE_URL}/test/metrics`, {
    cwd: runEnv.PLAY_SOURCE_DIRECTORY,
    env: { COOP_FIXTURE_PORT: '43177', COOP_FIXTURE_ORIGIN: new URL(runEnv.PLAYWRIGHT_BASE_URL).origin },
  });
}
if (needs.delivery && !runEnv.COOP_DELIVERY_FIXTURE_URL) {
  runEnv.COOP_DELIVERY_FIXTURE_URL = 'http://127.0.0.1:43176';
  await startServer('short-delivery', 'node', ['e2e/helpers/coopDeliveryServer.mjs', '43176'],
    `${runEnv.COOP_DELIVERY_FIXTURE_URL}/coop.html`);
}
if (needs.cityInput && !runEnv.CITY_INPUT_FIXTURE_URL) {
  runEnv.CITY_INPUT_FIXTURE_URL = 'http://127.0.0.1:43175/coop.html';
  await startServer('city-input', 'node', ['e2e/helpers/coopDeliveryServer.mjs', '43175', 'city-input'],
    runEnv.CITY_INPUT_FIXTURE_URL);
}
if (needs.production && !runEnv.CITY_COOP_PRODUCTION_URL) {
  const build = spawnSync('pnpm', ['build'], { stdio: 'inherit', env: runEnv });
  if (build.error || build.status !== 0) throw build.error ?? new Error('Production fixture build failed');
  runEnv.CITY_COOP_PRODUCTION_URL = 'http://127.0.0.1:43174/city-coop.html';
  await startServer('production-preview', 'node', ['apps/dayun-kicker/node_modules/vite/bin/vite.js',
    'preview', 'apps/dayun-kicker', '--host', '127.0.0.1', '--port', '43174', '--strictPort'], runEnv.CITY_COOP_PRODUCTION_URL);
}

let failed = 0;
const totals = { expected: 0, skipped: 0, unexpected: 0, flaky: 0 };
for (const [index, description] of tests.entries()) {
  const selection = join(directory, `${index}.txt`), reportFile = join(directory, `${index}.json`);
  writeFileSync(selection, `${description}\n`);
  console.log(`\nTest ${index + 1}/${tests.length}: ${description}`);
  // A separate invocation releases Chromium's GPU/audio process between cases.
  // Multi-page and multi-client interactions within one case stay together.
  const testEnv = { ...runEnv, PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile };
  // Only the two noncombat input/network journeys use the training authority.
  // Combat and production city cases retain their complete ordinary world.
  if (!description.includes('city-coop.spec.ts ›') || !/four real city clients|four-player city HUD/.test(description))
    delete testEnv.CITY_INPUT_FIXTURE_URL;
  // Exercise Dawn in the renderer suites. Keep the remaining software-rendered
  // journeys on Mesa OpenGL, including their original cold-start/frame budgets.
  if (runEnv.PLAYWRIGHT_USE_MESA === '1' && runEnv.PLAYWRIGHT_USE_VULKAN === '1' && !diagnosticGrep
    && !/render-backends?(?:-settings)?\.spec\.ts/.test(description)) testEnv.PLAYWRIGHT_USE_VULKAN = '0';
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', `--test-list=${selection}`,
    ...(performance ? ['--config=playwright.performance.config.ts'] : []),
    '--workers=1', '--reporter=github,json', `--output=${join(directory, `results-${index}`)}`], {
    stdio: 'inherit', env: testEnv,
  });
  try {
    const report = JSON.parse(readFileSync(reportFile, 'utf8'));
    const actual = descriptions(report);
    const count = Object.keys(totals).reduce((sum, key) => sum + report.stats[key], 0);
    if (actual.length !== 1 || actual[0] !== description || count !== 1 || report.errors.length) {
      throw new Error('Selected test was omitted, duplicated, or failed to load');
    }
    for (const key of Object.keys(totals)) totals[key] += report.stats[key];
    if (run.error || run.status !== 0 || report.stats.unexpected || report.stats.skipped) failed++;
  } catch (error) {
    console.error(error); failed++;
  }
}
console.log(`Shard ${shard} completed all ${tests.length} selections: ${JSON.stringify(totals)}`);
if (failed) { console.error(`${failed} test invocations failed`); process.exitCode = 1; }
// Owned listeners keep Node alive, so cleanup must run before waiting for exit.
stopServers();
