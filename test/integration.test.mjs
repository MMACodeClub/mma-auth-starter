// Testet die echten PHP-Endpunkte gegen eine isolierte MySQL-Instanz.
// Voraussetzungen: Docker, PHP >=8.1 mit curl/pdo_mysql, OpenSSL, Node >=22.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import net from 'node:net';
const root = path.resolve(import.meta.dirname, '..');
const origin = 'https://project.example.test';
const lea = { id: 'u_aaaaaaaaaaaaaaaa', name: 'Lea', email: 'lea@example.test', klasse: 'Test' };
const sam = { ...lea, id: 'u_bbbbbbbbbbbbbbbb', name: 'Sam' };
const tokenA = 'test_token_lea_abcdefghijkl';
const tokenB = 'test_token_sam_abcdefghijkl';
const foreign = 'test_token_foreign_abcdefgh';
const invalid = 'test_token_invalid_abcdefgh';
const broken = 'test_token_broken_abcdefghi';
const down = 'test_token_down_abcdefghijk';
function run(command, args, input) {
  const result = spawnSync(command, args, { encoding: 'utf8', input, timeout: 30000 });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.error}`);
  return result.stdout.trim();
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('PHP/MySQL: validation, two users, foreign IDs, project binding, auth failures and concurrent quota', { timeout: 120000 }, async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mma-starter-integration-'));
  const container = 'mma-starter-test-' + process.pid;
  let php;
  let auth;
  t.after(async () => {
    if (php) { try { process.kill(-php.pid, 'SIGTERM'); } catch (_) {} }
    auth?.closeAllConnections();
    if (auth) await new Promise((resolve) => auth.close(resolve));
    spawnSync('docker', ['rm', '-f', '-v', container], { stdio: 'ignore' });
    await fs.rm(temp, { recursive: true, force: true });
  });
  run('docker', ['run', '-d', '--rm', '--name', container, '--tmpfs', '/var/lib/mysql:rw,size=1073741824', '--tmpfs', '/tmp:rw,size=134217728', '-e', 'MYSQL_ALLOW_EMPTY_PASSWORD=yes', '-e', 'MYSQL_DATABASE=mma_test', '-p', '127.0.0.1::3306', process.env.MMA_TEST_MYSQL_IMAGE || 'mysql:8.4.13']);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const result = spawnSync('docker', ['exec', container, 'mysql', '-h', '127.0.0.1', '-u', 'root', 'mma_test', '-e', 'SELECT 1'], { stdio: 'ignore' });
    if (result.status === 0) { ready = true; break; }
    await sleep(300);
  }
  assert.ok(ready, 'isolated MySQL starts');
  const port = Number(run('docker', ['port', container, '3306/tcp']).split(':').at(-1));
  const sql = (query) => run('docker', ['exec', '-i', container, 'mysql', '-u', 'root', '--batch', '--skip-column-names', 'mma_test'], query);
  sql(await fs.readFile(path.join(root, 'schema.sql'), 'utf8'));
  await fs.cp(path.join(root, 'app'), path.join(temp, 'app'), { recursive: true });
  await fs.cp(path.join(root, 'public'), path.join(temp, 'public'), { recursive: true });
  run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(temp, 'ca-key.pem'), '-out', path.join(temp, 'ca.pem'), '-days', '1', '-subj', '/CN=MMA Test Root', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  run('openssl', ['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(temp, 'key.pem'), '-out', path.join(temp, 'server.csr'), '-subj', '/CN=localhost']);
  await fs.writeFile(path.join(temp, 'extensions.cnf'), 'subjectAltName=DNS:localhost\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n');
  run('openssl', ['x509', '-req', '-in', path.join(temp, 'server.csr'), '-CA', path.join(temp, 'ca.pem'), '-CAkey', path.join(temp, 'ca-key.pem'), '-CAcreateserial', '-out', path.join(temp, 'cert.pem'), '-days', '1', '-extfile', path.join(temp, 'extensions.cnf')]);
  run('openssl', ['verify', '-CAfile', path.join(temp, 'ca.pem'), path.join(temp, 'cert.pem')]);
  auth = https.createServer({ key: await fs.readFile(path.join(temp, 'key.pem')), cert: await fs.readFile(path.join(temp, 'cert.pem')) }, (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    let status = 200;
    let data = { user: { ...(token === tokenB ? sam : lea) }, origin };
    if (token === foreign) data.origin = 'https://other.example.test';
    if (token === invalid) { status = 401; data = { error: 'expired' }; }
    if (token === broken) data.user.id = []; // invalid structure
    if (token === down) { res.destroy(); return; }
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  });
  await new Promise((resolve) => auth.listen(0, resolve));
  const config = { auth_url: 'https://localhost:' + auth.address().port, app_origin: origin, db_host: '127.0.0.1;port=' + port, db_name: 'mma_test', db_user: 'root', db_password: '' };
  const writeConfig = async (values = config) => {
    // Only synthetic, container-local credentials; never reads a real config.php.
    const json = JSON.stringify(JSON.stringify(values));
    await fs.writeFile(path.join(temp, 'config.php'), `<?php return json_decode(${json}, true);`);
  };
  await writeConfig();
  const phpPort = await availablePort();
  php = spawn('php', ['-d', 'curl.cainfo=' + path.join(temp, 'ca.pem'), '-d', 'openssl.cafile=' + path.join(temp, 'ca.pem'), '-S', '127.0.0.1:' + phpPort, '-t', path.join(temp, 'public')], { env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' }, stdio: 'ignore', detached: true });
  const base = 'http://127.0.0.1:' + phpPort;
  const request = async (token, method = 'GET', body) => {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + '/api/notes.php', { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  for (let i = 0; i < 50; i++) {
    try { await fetch(base); break; } catch (_) { await sleep(100); }
  }
  assert.equal((await request()).status, 401);
  for (const bad of ['http://auth.example.test', 'https://auth.example.test/', 'https://auth.example.test/path', 'https://user:pass@auth.example.test', 'https://auth.example.test?q=1', 'https://auth.example.test#x', 'https://AUTH.example.test', 'https://auth.example.test:443', 'https://auth.example.test:0', 'https://auth.example.test\\evil']) {
    for (const key of ['auth_url', 'app_origin']) {
      await writeConfig({ ...config, [key]: bad });
      assert.equal((await request(tokenA)).status, 503, key + ': ' + bad);
    }
  }
  await writeConfig();
  let r = await request(tokenA, 'POST', { text: 'Leas privat', user_id: sam.id });
  assert.equal(r.status, 201, JSON.stringify(r));
  const aId = Number(r.data[0].id);
  r = await request(tokenB, 'POST', { text: 'Sams privat' });
  assert.equal(r.status, 201);
  const bId = Number(r.data[0].id);
  assert.deepEqual((await request(tokenA)).data.map((n) => n.text), ['Leas privat']);
  assert.deepEqual((await request(tokenB)).data.map((n) => n.text), ['Sams privat']);
  assert.equal((await request(tokenA, 'DELETE', { id: bId })).status, 404);
  assert.equal((await request(tokenB, 'DELETE', { id: aId })).status, 404);
  assert.equal((await request(tokenB)).data[0].text, 'Sams privat');
  for (const [token, expected] of [[foreign, 403], [invalid, 401], [broken, 502], [down, 502]]) {
    assert.equal((await request(token, 'POST', { text: 'Must not be saved' })).status, expected);
  }
  assert.equal(sql('SELECT COUNT(*) FROM notes;'), '2');
  assert.equal((await request(tokenA, 'POST', { text: "' OR 1=1 --" })).status, 201);
  assert.equal((await request(tokenA)).data.length, 2);
  assert.equal(sql("SELECT COUNT(*) FROM users WHERE id = 'U_AAAAAAAAAAAAAAAA';"), '0');
  assert.equal(sql("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'mma_test' AND table_name = 'users' AND column_name IN ('name', 'email');"), '0');
  // 2 existing + 97 synthetic rows = 99; concurrent requests may add only one.
  sql(Array.from({ length: 97 }, (_, i) => `INSERT INTO notes (user_id, text) VALUES ('${lea.id}', 'fixture ${i}');`).join('\n'));
  const parallel = await Promise.all(Array.from({ length: 4 }, () => request(tokenA, 'POST', { text: 'last slot' })));
  assert.equal(parallel.filter((r) => r.status === 201).length, 1);
  assert.equal(parallel.filter((r) => r.status === 409).length, 3);
  assert.equal(sql(`SELECT COUNT(*) FROM notes WHERE user_id = '${lea.id}';`), '100');
  assert.equal((await request(tokenA, 'DELETE', { id: aId })).status, 200);
  assert.equal((await request(tokenA, 'POST', { text: 'slot free again' })).status, 201);
  // Migration from the exact original starter schema preserves private notes.
  sql(`DROP TABLE notes; DROP TABLE users;\nCREATE TABLE users (id VARCHAR(32) PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\nCREATE TABLE notes (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL, text VARCHAR(500) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\nINSERT INTO users VALUES ('${lea.id}', 'Test', 'test@example.test');\nINSERT INTO notes (user_id, text) VALUES ('${lea.id}', 'Must survive migration');`);
  sql(await fs.readFile(path.join(root, 'migrations/2026-11-auth-ids.sql'), 'utf8'));
  assert.equal((await request(tokenA)).data[0].text, 'Must survive migration');
  assert.equal((await request(tokenA, 'POST', { text: 'Works after migration' })).status, 201);
});
