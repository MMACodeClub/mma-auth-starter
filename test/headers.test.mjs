// Lokaler Apache-Test für die tatsächlichen Header aus public/.htaccess.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

test('Apache applies HTML security headers from the shipped .htaccess', async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mma-starter-apache-'));
  let server;
  t.after(async () => { if (server) { const stopped = new Promise((resolve) => server.once('exit', resolve)); if (server.exitCode === null) { server.kill(); await stopped; } } await fs.rm(temp, { recursive: true, force: true }); });
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const publicDir = path.join(temp, 'public');
  await fs.mkdir(publicDir);
  for (const file of ['index.html', '.htaccess']) await fs.copyFile(new URL('../public/' + file, import.meta.url), path.join(publicDir, file));
  const modules = process.env.MMA_TEST_APACHE_MODULES || '/usr/libexec/apache2';
  const binary = process.env.MMA_TEST_HTTPD || '/usr/sbin/httpd';
  const config = `ServerRoot "${temp}"\nListen 127.0.0.1:${port}\nServerName localhost\nPidFile "${temp}/httpd.pid"\nErrorLog "${temp}/error.log"\n` + ['mpm_event', 'unixd', 'authz_core', 'dir', 'mime', 'headers'].map((name) => `LoadModule ${name}_module "${modules}/mod_${name}.so"`).join('\n') + `\nTypesConfig /etc/apache2/mime.types\nDocumentRoot "${publicDir}"\nDirectoryIndex index.html\n<Directory "${publicDir}">\nAllowOverride FileInfo\nRequire all granted\n</Directory>\n`;
  const configPath = path.join(temp, 'httpd.conf');
  await fs.writeFile(configPath, config);
  const check = spawnSync(binary, ['-t', '-f', configPath], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr || String(check.error));
  server = spawn(binary, ['-f', configPath, '-DFOREGROUND'], { stdio: 'ignore' });
  let response;
  for (let i = 0; i < 100; i++) { try { response = await fetch('http://127.0.0.1:' + port); break; } catch (_) {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  assert.ok(response, 'Apache starts: ' + await fs.readFile(path.join(temp, 'error.log'), 'utf8').catch(() => 'no log'));
  assert.equal(response.status, 200);
  const csp = response.headers.get('content-security-policy');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' https:\/\/auth.mmacodeclub.ch/);
  assert.match(csp, /connect-src 'self' https:\/\/auth.mmacodeclub.ch/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
