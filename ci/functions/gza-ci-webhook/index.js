// SPDX-License-Identifier: Apache-2.0
const { createHmac, timingSafeEqual } = require('node:crypto');

const WORKFLOW = 'https://api.github.com/repos/YunLeFun/gza/actions/workflows/build-private-source.yml';
const MAX_BYTES = 1024 * 1024;
const response = (statusCode, value) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(value),
  isBase64Encoded: false,
});

function createHandler({ secret, token, fetch: request = globalThis.fetch }) {
  return async (event) => {
    if (event?.httpMethod === 'GET') return response(200, { ok: true });
    if (event?.httpMethod !== 'POST') return response(405, { error: 'method-not-allowed' });
    if (!secret || !token) return response(503, { error: 'relay-not-configured' });
    if (typeof event.body !== 'string' || event.body.length > MAX_BYTES * 2) {
      return response(413, { error: 'invalid-body' });
    }
    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    if (body.length > MAX_BYTES) return response(413, { error: 'body-too-large' });
    const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
    const signature = headers['x-hub-signature-256'];
    if (typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature)
      || !timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), createHmac('sha256', secret).update(body).digest())) {
      return response(403, { error: 'invalid-signature' });
    }
    if (headers['x-github-event'] === 'ping') return response(200, { ok: true });
    if (headers['x-github-event'] !== 'push') return response(200, { ignored: true });
    let payload;
    try { payload = JSON.parse(body.toString('utf8')); }
    catch { return response(400, { error: 'invalid-json' }); }
    if (payload?.repository?.full_name !== 'YunLeFun/dayun-kicker'
      || payload.ref !== 'refs/heads/main' || payload.deleted === true) {
      return response(200, { ignored: true });
    }
    const sourceSha = payload.after;
    if (typeof sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(sourceSha) || /^0{40}$/.test(sourceSha)) {
      return response(400, { error: 'invalid-source-sha' });
    }

    // Bound both GitHub requests to the webhook's response window. Do not log
    // request bodies, headers, upstream error bodies or environment variables.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const options = {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'gza-ci-webhook',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      redirect: 'error',
    };
    try {
      const recent = await request(`${WORKFLOW}/runs?event=workflow_dispatch&branch=main&per_page=100`, options);
      if (!recent.ok) return response(502, { error: 'run-lookup-failed' });
      const runs = (await recent.json()).workflow_runs;
      if (!Array.isArray(runs)) return response(502, { error: 'invalid-run-response' });
      // Redeliveries of a running or successful revision do not restart it.
      // Failed and cancelled builds can be retried by redelivering the webhook.
      const existing = runs.find(run => run.head_branch === 'main'
        && run.display_title === `Build source ${sourceSha}`
        && (run.status !== 'completed' || run.conclusion === 'success'));
      if (existing) return response(200, { duplicate: true, sourceSha, runId: existing.id });
      const dispatched = await request(`${WORKFLOW}/dispatches`, {
        ...options,
        method: 'POST',
        body: JSON.stringify({
          ref: 'main', inputs: { source_sha: sourceSha, build_docs: 'false' }, return_run_details: true,
        }),
      });
      if (dispatched.status !== 200 && dispatched.status !== 204) {
        return response(502, { error: 'dispatch-failed' });
      }
      const details = dispatched.status === 200 ? await dispatched.json() : {};
      return response(202, { dispatched: true, sourceSha, runId: details.workflow_run_id });
    } catch {
      return response(502, { error: 'github-unavailable' });
    } finally { clearTimeout(timer); }
  };
}

exports.createHandler = createHandler;
exports.main = event => createHandler({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
  token: process.env.GZA_DISPATCH_TOKEN,
})(event);
