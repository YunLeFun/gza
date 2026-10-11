// SPDX-License-Identifier: Apache-2.0
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import relay from '../functions/gza-ci-webhook/index.js';

const secret = 'test-only-webhook-secret', token = 'test-only-dispatch-token', sha = 'a'.repeat(40);
const payload = { repository: { full_name: 'YunLeFun/dayun-kicker' }, ref: 'refs/heads/main', after: sha };
const signed = (value = payload, event = 'push') => {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return { httpMethod: 'POST', body, headers: {
    'x-github-event': event,
    'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`,
  } };
};
const mock = (runs = []) => {
  const calls = [];
  const handler = relay.createHandler({ secret, token, fetch: async (url, options) => {
    calls.push({ url, options });
    return options.method === 'POST'
      ? { status: 200, json: async () => ({ workflow_run_id: 123 }) }
      : { ok: true, json: async () => ({ workflow_runs: runs }) };
  } });
  return { handler, calls };
};

test('dispatches only the signed main SHA to the fixed public workflow', async () => {
  const { handler, calls } = mock();
  const result = await handler(signed({ ...payload, inputs: { source_sha: 'b'.repeat(40) }, workflow: 'untrusted.yml' }));
  assert.equal(result.statusCode, 202);
  assert.deepEqual(JSON.parse(result.body), { dispatched: true, sourceSha: sha, runId: 123 });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.github.com/repos/YunLeFun/gza/actions/workflows/build-private-source.yml/dispatches');
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    ref: 'main', inputs: { source_sha: sha, build_docs: 'false' }, return_run_details: true,
  });
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${token}`);
  assert.ok(!result.body.includes(token) && !result.body.includes(secret));
});

test('verifies the original UTF-8 bytes even when the gateway uses base64 and mixed-case headers', async () => {
  const { handler } = mock();
  const request = signed({ ...payload, note: '大云\n' });
  request.headers['X-Hub-Signature-256'] = request.headers['x-hub-signature-256'];
  delete request.headers['x-hub-signature-256'];
  request.body = Buffer.from(request.body).toString('base64'); request.isBase64Encoded = true;
  assert.equal((await handler(request)).statusCode, 202);
});

test('rejects missing, malformed and tampered signatures before contacting GitHub', async () => {
  for (const signature of [undefined, 'sha256=abc', `sha256=${'0'.repeat(64)}`]) {
    const { handler, calls } = mock(), request = signed();
    request.headers['x-hub-signature-256'] = signature;
    assert.equal((await handler(request)).statusCode, 403); assert.equal(calls.length, 0);
  }
  const { handler, calls } = mock(), request = signed(); request.body += ' ';
  assert.equal((await handler(request)).statusCode, 403); assert.equal(calls.length, 0);
});

test('ignores other repositories, branches, deletions and event types', async () => {
  for (const value of [
    { ...payload, repository: { full_name: 'YunLeFun/other' } },
    { ...payload, ref: 'refs/heads/feature' }, { ...payload, deleted: true },
  ]) {
    const { handler, calls } = mock();
    assert.deepEqual(JSON.parse((await handler(signed(value))).body), { ignored: true });
    assert.equal(calls.length, 0);
  }
  const { handler, calls } = mock();
  assert.equal((await handler(signed({}, 'ping'))).statusCode, 200);
  assert.equal((await handler(signed(payload, 'pull_request'))).statusCode, 200);
  assert.equal(calls.length, 0);
});

test('rejects invalid or zero SHAs and invalid JSON without dispatching', async () => {
  for (const value of [{ ...payload, after: 'main' }, { ...payload, after: '0'.repeat(40) }, '{']) {
    const { handler, calls } = mock();
    assert.equal((await handler(signed(value))).statusCode, 400); assert.equal(calls.length, 0);
  }
});

test('does not restart running or successful revisions, and permits failed builds to be retried', async () => {
  for (const run of [
    { status: 'in_progress', conclusion: null }, { status: 'completed', conclusion: 'success' },
  ]) {
    const { handler, calls } = mock([{ ...run, id: 100, head_branch: 'main', display_title: `Build source ${sha}` }]);
    assert.equal(JSON.parse((await handler(signed())).body).duplicate, true); assert.equal(calls.length, 1);
  }
  const { handler, calls } = mock([{ id: 100, status: 'completed', conclusion: 'failure', head_branch: 'main', display_title: `Build source ${sha}` }]);
  assert.equal((await handler(signed())).statusCode, 202); assert.equal(calls.length, 2);
});

test('fails closed on upstream failures without returning their secret-bearing response', async () => {
  for (const request of [
    async () => ({ ok: false }), async () => { throw new Error(token); },
    async () => ({ ok: true, json: async () => ({}) }),
  ]) {
    const handler = relay.createHandler({ secret, token, fetch: request });
    const result = await handler(signed());
    assert.equal(result.statusCode, 502); assert.ok(!result.body.includes(token));
  }
});

test('returns fixed health data, refuses unconfigured dispatch and rejects oversized bodies', async () => {
  const handler = relay.createHandler({});
  assert.deepEqual(JSON.parse((await handler({ httpMethod: 'GET', headers: { 'x-cloudbase-context': 'platform-secret' } })).body), { ok: true });
  assert.equal((await handler(signed())).statusCode, 503);
  assert.equal((await handler({ httpMethod: 'PUT' })).statusCode, 405);
  const { handler: configured, calls } = mock();
  assert.equal((await configured(signed('x'.repeat(1024 * 1024 + 1)))).statusCode, 413);
  assert.equal(calls.length, 0);
});
