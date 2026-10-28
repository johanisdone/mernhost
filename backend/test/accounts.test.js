import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { makeServer } from '../src/server.js';
import { Application, CompanyCounter, prepareIndexes } from '../src/models/Application.js';
import { Account, LoginSession } from '../src/models/Account.js';
import { currentDay } from '../src/domain/calendar.js';
import { requirePrivateDatabase } from '../src/config/privateDatabase.js';

let database, app;
const password = randomBytes(24).toString('hex');
const passed = [];
const scenario = (name, work) => test(name, async () => { await work(); passed.push(name); });
const sample = () => ({ companyName: 'Infosys', jobRole: 'Frontend Developer', jobType: 'Full-time', appliedDate: currentDay() });
before(async () => {
  database = await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
  await mongoose.connect(database.getUri());
  await prepareIndexes();
});
beforeEach(async () => {
  await Promise.all([Application.deleteMany({}), CompanyCounter.deleteMany({}), Account.deleteMany({}), LoginSession.deleteMany({})]);
  app = makeServer();
});
after(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
  const folder = new URL('../../docs/evidence/', import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL('accounts.json', folder), JSON.stringify({ runAt: new Date().toISOString(), environment: 'Isolated MongoDB; session and ownership integration', passed: passed.length, checks: passed }, null, 2));
});

async function register(email = 'alex@example.test', name = 'Alex Demo') {
  const api = request.agent(app);
  const response = await api.post('/api/auth/register').send({ name, email, password }).expect(201);
  return { api, account: response.body.data, response };
}

scenario('Registration hashes passwords and stores only a digest of an HttpOnly session token', async () => {
  const { api, account, response } = await register();
  assert.deepEqual(Object.keys(account).sort(), ['email', 'id', 'name']);
  const stored = await Account.findById(account.id).select('+passwordHash');
  assert.ok(await bcrypt.compare(password, stored.passwordHash));
  assert.notEqual(stored.passwordHash, password);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  const token = cookie.split(';')[0].split('=')[1];
  assert.notEqual((await LoginSession.findOne())._id, token);
  const me = await api.get('/api/auth/me').expect(200);
  assert.deepEqual(me.body.data, account);
});

scenario('Bad account input, duplicate emails, unexpected identity fields, and overlong passwords are rejected', async () => {
  await request(app).post('/api/auth/register').send({ name: 'A', email: 'invalid', password: 'short' }).expect(400);
  await register();
  await request(app).post('/api/auth/register').send({ name: 'Other Demo', email: 'ALEX@example.test', password }).expect(409);
  await request(app).post('/api/auth/register').send({ name: 'Other Demo', email: 'other@example.test', password, role: 'admin' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: 'alex@example.test', password: 'x'.repeat(73) }).expect(400);
  await request(app).post('/api/auth/register').send({ name: 'Other Demo', email: 'other@example.test', password: 'é'.repeat(37) }).expect(400);
});

scenario('Login rotates sessions and logout revokes replay of the old cookie', async () => {
  const { api, response } = await register();
  const original = response.headers['set-cookie'][0].split(';')[0];
  await api.post('/api/auth/login').send({ email: 'alex@example.test', password: 'wrong-password' }).expect(401);
  await api.post('/api/auth/login').send({ email: 'missing@example.test', password }).expect(401);
  const login = await api.post('/api/auth/login').send({ email: 'ALEX@example.test', password }).expect(200);
  await request(app).get('/api/auth/me').set('Cookie', original).expect(401);
  const current = login.headers['set-cookie'][0].split(';')[0];
  await api.post('/api/auth/logout').expect(200);
  await api.get('/api/auth/me').expect(401);
  await request(app).get('/api/auth/me').set('Cookie', current).expect(401);
  assert.equal(await LoginSession.countDocuments(), 0);
});

scenario('Expired sessions, malformed tokens, and deleted accounts cannot access a journal', async () => {
  const { api, account } = await register();
  await LoginSession.updateMany({ account: account.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await api.get('/api/applications').expect(401);
  await request(app).get('/api/auth/me').set('Cookie', 'nextstep_session=invalid').expect(401);
  await api.post('/api/auth/login').send({ email: account.email, password }).expect(200);
  await Account.deleteOne({ _id: account.id });
  await api.get('/api/applications/stats').expect(401);
});

scenario('Every application data endpoint requires a valid session', async () => {
  const id = new mongoose.Types.ObjectId();
  await request(app).get('/api/applications').expect(401);
  await request(app).get('/api/applications/stats').expect(401);
  await request(app).get(`/api/applications/${id}`).expect(401);
  await request(app).post('/api/applications').send(sample()).expect(401);
  await request(app).patch(`/api/applications/${id}`).send({ notes: 'No session.' }).expect(401);
  await request(app).patch(`/api/applications/${id}/status`).send({ status: 'Interview' }).expect(401);
  await request(app).delete(`/api/applications/${id}`).expect(401);
});

scenario('Two accounts have independent lists, counts, overdue counts, duplicates, and company sequences', async () => {
  const alice = await register();
  const bob = await register('bob@example.test', 'Bob Demo');
  const a = (await alice.api.post('/api/applications').send({ ...sample(), appliedDate: '2020-01-01' }).expect(201)).body.data;
  assert.equal((await bob.api.get('/api/applications')).body.data.items.length, 0);
  const emptyStats = (await bob.api.get('/api/applications/stats')).body.data;
  assert.equal(emptyStats.total, 0);
  assert.equal(emptyStats.overdue, 0);
  const b = (await bob.api.post('/api/applications').send(sample()).expect(201)).body.data;
  assert.equal(a.applicationId, 'JA-INF-001');
  assert.equal(b.applicationId, 'JA-INF-001');
  assert.notEqual(a._id, b._id);
  assert.equal((await alice.api.get('/api/applications')).body.data.items.length, 1);
  assert.equal((await bob.api.get('/api/applications/stats')).body.data.total, 1);
  await bob.api.post('/api/applications').send({ ...sample(), companyName: 'INFOSYS' }).expect(409);
});

scenario('Guessing another owner ID cannot read, edit, delete, or transition their application', async () => {
  const alice = await register();
  const bob = await register('bob@example.test');
  const a = (await alice.api.post('/api/applications').send(sample()).expect(201)).body.data;
  await bob.api.get(`/api/applications/${a._id}`).expect(404);
  await bob.api.patch(`/api/applications/${a._id}`).send({ notes: 'Attempted overwrite.' }).expect(404);
  await bob.api.patch(`/api/applications/${a._id}/status`).send({ status: 'Rejected' }).expect(404);
  await bob.api.delete(`/api/applications/${a._id}`).expect(404);
  await bob.api.post('/api/applications').send({ ...sample(), owner: alice.account.id }).expect(400);
  await bob.api.get(`/api/applications?owner=${alice.account.id}`).expect(400);
  assert.equal((await Application.findById(a._id)).status, 'Applied');
  assert.equal((await Application.findById(a._id)).notes, '');
});

scenario('Unowned legacy rows and old shared collections are never assigned to a new account', async () => {
  const oldId = new mongoose.Types.ObjectId();
  await Application.collection.insertOne({ _id: oldId, ...sample(), applicationId: 'JA-OLD-001', companyKey: 'infosys', roleKey: 'frontend developer', status: 'Applied', isActive: true, followUpDate: '2020-01-08', statusHistory: [] });
  await mongoose.connection.collection('applications').insertOne({ ...sample(), legacy: true });
  const { api } = await register();
  assert.equal((await api.get('/api/applications')).body.data.items.length, 0);
  assert.equal((await api.get('/api/applications/stats')).body.data.total, 0);
  await api.get(`/api/applications/${oldId}`).expect(404);
  await mongoose.connection.collection('applications').deleteMany({ legacy: true });
});

scenario('Cross-origin mutations are blocked and account attempts are rate limited', async () => {
  const { api } = await register();
  await api.post('/api/auth/logout').set('Origin', 'https://not-your-journal.example').expect(403);
  await api.get('/api/auth/me').expect(200);
  await api.post('/api/auth/logout').set('Origin', 'http://localhost:5174').expect(200);
  let blocked = false;
  for (let i = 0; i < 31; i++) {
    const result = await request(app).post('/api/auth/login').send({});
    if (result.status === 429) { blocked = true; assert.equal(result.body.success, false); break; }
  }
  assert.ok(blocked);
});

scenario('Production sessions use Secure cookies and public exam database configuration is rejected', async () => {
  const before = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { response } = await register();
    assert.match(response.headers['set-cookie'][0], /; Secure/);
  } finally {
    if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before;
  }
  assert.throws(() => requirePrivateDatabase('mongodb+srv://mernuser:example@cluster.example.net/nextstep_private'));
  assert.throws(() => requirePrivateDatabase('mongodb+srv://privateuser:example@cluster.example.net/mernfinal_exam/'));
  assert.throws(() => requirePrivateDatabase('mongodb+srv://privateuser:example@cluster.example.net/'));
  assert.doesNotThrow(() => requirePrivateDatabase('mongodb+srv://privateuser:example@cluster.example.net/nextstep_private'));
});
