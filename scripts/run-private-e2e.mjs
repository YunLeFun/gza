// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const shard = process.argv[2];
if (!/^\d+\/\d+$/.test(shard ?? '')) throw new Error('Provide a Playwright shard, e.g. 3/16');
const directory = mkdtempSync(join(tmpdir(), 'gza-e2e-'));
const enumeration = join(directory, 'enumeration.json');
const listed = spawnSync('pnpm', ['test:e2e', '--fully-parallel', `--shard=${shard}`, '--list', '--reporter=json'], {
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
writeFileSync(join(directory, 'manifest.json'), JSON.stringify(tests, null, 2));
console.log(`Shard ${shard}: ${tests.length} tests, each with a fresh browser process`);
if (process.argv.includes('--list')) {
  console.log(JSON.stringify(tests));
  process.exit(0);
}

let failed = 0;
const totals = { expected: 0, skipped: 0, unexpected: 0, flaky: 0 };
for (const [index, description] of tests.entries()) {
  const selection = join(directory, `${index}.txt`), reportFile = join(directory, `${index}.json`);
  writeFileSync(selection, `${description}\n`);
  console.log(`\nTest ${index + 1}/${tests.length}: ${description}`);
  // A separate invocation releases Chromium's GPU/audio process between cases.
  // Multi-page and multi-client interactions within one case stay together.
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', `--test-list=${selection}`,
    '--workers=1', '--reporter=github,json', `--output=${join(directory, `results-${index}`)}`], {
    stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile },
  });
  try {
    const report = JSON.parse(readFileSync(reportFile, 'utf8'));
    const actual = descriptions(report);
    const count = Object.keys(totals).reduce((sum, key) => sum + report.stats[key], 0);
    if (actual.length !== 1 || actual[0] !== description || count !== 1 || report.errors.length) {
      throw new Error('Selected test was omitted, duplicated, or failed to load');
    }
    for (const key of Object.keys(totals)) totals[key] += report.stats[key];
    if (run.error || run.status !== 0 || report.stats.unexpected) failed++;
  } catch (error) {
    console.error(error); failed++;
  }
}
console.log(`Shard ${shard} completed all ${tests.length} selections: ${JSON.stringify(totals)}`);
if (failed) { console.error(`${failed} test invocations failed`); process.exitCode = 1; }
