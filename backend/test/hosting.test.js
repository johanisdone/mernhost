import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import request from 'supertest';
import { makeServer, browserOrigin } from '../src/server.js';

function withOrigins(values, work) {
  const before = { FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN, RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL };
  for (const key of Object.keys(before)) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  return Promise.resolve().then(work).finally(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

test('Render origin is detected automatically and used by the API CORS response', async () => {
  await withOrigins({ RENDER_EXTERNAL_URL: 'https://nextstep-test.onrender.com' }, async () => {
    assert.equal(browserOrigin(), 'https://nextstep-test.onrender.com');
    const result = await request(makeServer()).get('/api/applications/options').set('Origin', 'https://nextstep-test.onrender.com').expect(200);
    assert.equal(result.headers['access-control-allow-origin'], 'https://nextstep-test.onrender.com');
  });
});

test('Explicit frontend overrides normalize to an origin and local development has a sensible default', async () => {
  await withOrigins({ FRONTEND_ORIGIN: 'https://jobs.example.com/' }, () => assert.equal(browserOrigin(), 'https://jobs.example.com'));
  await withOrigins({}, () => assert.equal(browserOrigin(), 'http://localhost:5174'));
});

test('Built frontend serves deep links while missing assets and unknown APIs remain 404', { skip: !existsSync(new URL('../../frontend/dist/index.html', import.meta.url)) }, async () => {
  const app = makeServer();
  const document = await request(app).get('/applications/000000000000000000000000').expect(200);
  assert.match(document.headers['content-type'], /text\/html/);
  assert.match(document.text, /NextStep/);
  await request(app).get('/assets/does-not-exist.js').expect(404);
  const missing = await request(app).get('/api/does-not-exist').expect(404);
  assert.equal(missing.body.success, false);
});
