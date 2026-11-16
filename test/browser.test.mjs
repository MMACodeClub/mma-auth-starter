import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const root = new URL('../public/', import.meta.url);
const html = await fs.readFile(new URL('index.html', root), 'utf8');
const script = await fs.readFile(new URL('script.js', root), 'utf8');
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });
const notes = [{ id: 1, text: 'Private Notiz' }, { id: 2, text: '<img src=x onerror=alert(1)>' }];

async function fixture(t, handle, fast = false) {
  const context = await browser.newContext();
  t.after(() => context.close());
  if (fast) await context.addInitScript(() => {
    const timeout = setTimeout;
    window.setTimeout = (fn, ms) => timeout(fn, ms === 10000 ? 30 : ms);
  });
  const calls = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/sdk')) return route.fulfill({ contentType: 'text/javascript', body: `window.mmaAuth = { user: async () => ({ id: 'u_aaaaaaaaaaaaaaaa' }), fetch: (url, init) => fetch(url, init) };` });
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html.replace(/ integrity="[^"]+"/, '') }); // SDK is mocked; its real SRI is checked in mma-auth.
    if (url.pathname === '/script.js') return route.fulfill({ contentType: 'text/javascript', body: script });
    if (url.pathname === '/api/notes.php') {
      calls.push(route.request());
      if (await handle?.(route, calls)) return;
      return route.fulfill({ json: notes });
    }
    return route.fulfill({ body: '' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', (error) => console.error('Browser:', error.message));
  await page.goto('https://project.example.test');
  await page.locator('#workspace:not([hidden])').waitFor();
  return { page, calls };
}

test('expired login or wrong project hides and clears private data, including draft text', async (t) => {
  for (const status of [401, 403]) {
    const { page } = await fixture(t, async (route) => {
      if (route.request().method() === 'GET') return false;
      await route.fulfill({ status, json: { error: 'denied' } }); return true;
    });
    await page.locator('#text').fill('Privater Entwurf');
    await page.locator('#note-form button').click();
    await page.locator('#workspace[hidden]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#list li').count(), 0);
    assert.equal(await page.locator('#text').inputValue(), '');
    assert.match(await page.locator('#status').textContent(), /erneut an/);
  }
});

test('all writes share one lock; delete needs confirmation and renders text safely', async (t) => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  const { page, calls } = await fixture(t, async (route) => {
    if (route.request().method() === 'GET') return false;
    await wait;
    await route.fulfill({ json: notes }); return true;
  });
  assert.equal(await page.locator('#list img').count(), 0);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#list button').first().click();
  assert.equal(calls.length, 1);
  await page.locator('#text').fill('Neu');
  await page.locator('#note-form button').click();
  await page.waitForFunction(() => document.querySelector('#note-form button').disabled);
  assert.equal(await page.locator('#list button:disabled').count(), 2);
  // Even manually dispatched submit events cannot bypass the common lock.
  await page.locator('#note-form').dispatchEvent('submit');
  assert.equal(calls.length, 2);
  release();
  await page.waitForFunction(() => !document.querySelector('#note-form button').disabled);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#list button').first().click();
  await page.waitForFunction(() => !document.querySelector('#note-form button').disabled);
  assert.equal(calls.at(-1).method(), 'DELETE');
});

test('interrupted or ambiguous writes block retries until reload', async (t) => {
  for (const kind of ['network', 'timeout', 'server', 'invalid-json']) {
    const { page, calls } = await fixture(t, async (route) => {
      if (route.request().method() === 'GET') return false;
      if (kind === 'network') await route.abort('failed');
      if (kind === 'server') await route.fulfill({ status: 500, json: { error: 'DB failed after commit' } });
      if (kind === 'invalid-json') await route.fulfill({ body: 'broken response' });
      return true; // timeout: wait until AbortController cancels the request
    }, true);
    await page.locator('#text').fill('Vielleicht gespeichert');
    await page.locator('#note-form button').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Speicherstatus unklar'));
    assert.equal(await page.locator('#note-form button').isDisabled(), true);
    assert.equal(await page.locator('#list button:disabled').count(), 2);
    assert.equal(await page.locator('#reload').isVisible(), true);
    await page.locator('#note-form').dispatchEvent('submit');
    assert.equal(calls.length, 2);
    await page.locator('#reload').click();
    await page.waitForFunction(() => !document.querySelector('#note-form button').disabled);
    assert.equal(calls.length, 3); // GET only, no repeated POST
  }
});

test('a definite validation rejection leaves writing available', async (t) => {
  const { page } = await fixture(t, async (route) => {
    if (route.request().method() === 'GET') return false;
    await route.fulfill({ status: 409, json: { error: 'Höchstens 100 Notizen' } }); return true;
  });
  await page.locator('#text').fill('Zu viel');
  await page.locator('#note-form button').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('100'));
  assert.equal(await page.locator('#note-form button').isDisabled(), false);
});

test('local logout clears the workspace while an older write response is still pending', async (t) => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  const { page } = await fixture(t, async (route) => {
    if (route.request().method() === 'GET') return false;
    await wait;
    await route.fulfill({ json: notes }); return true;
  });
  await page.locator('#text').fill('Entwurf');
  await page.locator('#note-form button').click();
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('mma:user', { detail: null })));
  release();
  await page.waitForFunction(() => document.querySelector('#workspace').getAttribute('aria-busy') === 'false');
  assert.equal(await page.locator('#workspace').isHidden(), true);
  assert.equal(await page.locator('#list li').count(), 0);
});
