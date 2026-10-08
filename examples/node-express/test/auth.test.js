import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createApp } from '../app.js';

const origin = 'http://localhost:3000';
const tokenA = 'a'.repeat(32);
const tokenB = 'b'.repeat(32);
const tokenOtherProject = 'c'.repeat(32);
const tokenUnavailable = 'd'.repeat(32);
const tokenMalformed = 'e'.repeat(32);
let authServer, appServer, base;

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
}
function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

before(async () => {
  // Nur erfundene Tokens: Dieser Server ersetzt den zentralen Dienst im Test.
  authServer = createServer((req, res) => {
    const token = (req.headers.authorization || '').slice(7);
    res.setHeader('Content-Type', 'application/json');
    if (req.url !== '/api/me') { res.writeHead(404); return res.end('{}'); }
    if (token === tokenUnavailable) { res.writeHead(503); return res.end('{}'); }
    if (token === tokenMalformed) return res.end('{broken');
    if (![tokenA, tokenB, tokenOtherProject].includes(token)) { res.writeHead(401); return res.end('{}'); }
    res.end(JSON.stringify({
      origin: token === tokenOtherProject ? 'https://anderes-projekt.example' : origin,
      user: { id: token === tokenB ? 'u_testperson_b' : 'u_testperson_a', name: 'Testperson', email: 'test@example.org', klasse: 'Testklasse' },
    }));
  });
  const authUrl = await listen(authServer);
  appServer = createServer(createApp({ authUrl, appOrigin: origin }));
  base = await listen(appServer);
});
after(async () => { await close(appServer); await close(authServer); });

const request = (token, options = {}) => fetch(base + '/api/notes', {
  ...options,
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
});

test('Frontend lädt ohne Zugangsdaten', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /https:\/\/auth\.mmacodeclub\.ch\/sdk\.js/);
});
test('fehlendes Token: kein Zugriff', async () => assert.equal((await request()).status, 401));
test('ungültiges Token: kein Zugriff', async () => assert.equal((await request('x'.repeat(32))).status, 401));
test('gültiges Token eines fremden Projekts: kein Zugriff', async () => assert.equal((await request(tokenOtherProject)).status, 403));
test('Auth-Service ausgefallen: keine geschützten Daten', async () => assert.equal((await request(tokenUnavailable)).status, 502));
test('ungültige Auth-Antwort: keine geschützten Daten', async () => assert.equal((await request(tokenMalformed)).status, 502));
test('falsche Eingabetypen und zu lange Texte werden abgelehnt', async () => {
  for (const text of ['', '   ', [], { value: 'test' }, 'x'.repeat(501)]) {
    const r = await request(tokenA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    assert.equal(r.status, 400);
  }
});
test('ungültiges JSON wird als JSON-Fehler beantwortet', async () => {
  const r = await request(tokenA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(r.status, 400);
  assert.equal(typeof (await r.json()).error, 'string');
});
test('Notizen sind getrennt; mitgeschickte user_id wird ignoriert', async () => {
  const r = await request(tokenA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Nur für A', user_id: 'u_testperson_b' }) });
  assert.equal(r.status, 201);
  assert.equal((await r.json())[0].text, 'Nur für A');
  assert.deepEqual(await (await request(tokenB)).json(), []);
  const own = await request(tokenA);
  assert.equal(own.headers.get('cache-control'), 'no-store');
  assert.equal((await own.json())[0].text, 'Nur für A');
});
test('nicht unterstützte Methoden werden abgelehnt', async () => assert.equal((await request(tokenA, { method: 'DELETE' })).status, 405));
test('Origin-Konfiguration mit Pfad scheitert beim Start', () => {
  assert.throws(() => createApp({ appOrigin: 'http://localhost:3000/projekt' }), /APP_ORIGIN/);
});
