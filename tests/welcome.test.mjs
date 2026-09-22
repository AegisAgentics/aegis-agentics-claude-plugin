import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const pluginRoot = resolve(import.meta.dirname, '../plugins/aegis-agentics');
const welcomeRoot = resolve(pluginRoot, 'skills/welcome_user');
const rendererPath = resolve(welcomeRoot, 'scripts/render-welcome.mjs');
const templatePath = resolve(welcomeRoot, 'assets/welcome-template.html');
const skill = (name) => readFileSync(resolve(pluginRoot, `skills/${name}/SKILL.md`), 'utf8');

test('welcome policy renders once and continues the original request automatically', () => {
  const text = skill('welcome_user');
  assert.match(text, /first eligible Aegis Agentics request/i);
  assert.match(text, /exactly once/i);
  assert.match(text, /continue the original request automatically/i);
  assert.match(text, /never ask.*confirm.*press.*button/is);
  assert.match(text, /one Artifact rendering attempt/i);
  assert.match(text, /concise text fallback/i);
});

test('shared first-request gate handles begin_turn failure without a collection query', () => {
  const text = skill('interaction-reference');
  assert.match(text, /If the first eligible `begin_turn` fails/i);
  assert.match(text, /render the unavailable welcome once without querying collections/i);
  assert.match(text, /counts as presented/i);
  assert.match(text, /never render the welcome again/i);
});

test('successful first request reuses one unfiltered bootstrap collection list', () => {
  const text = skill('interaction-reference');
  assert.match(text, /one unfiltered `context-hub\.queryCollections`/i);
  assert.match(text, /reuse that same authorized list.*active skill/is);
  assert.match(skill('status'), /load `welcome_user` only when the shared first-request gate requires it/i);
  assert.match(skill('knowledge-search'), /load `welcome_user` only when the shared first-request gate requires it/i);
});

test('renderer escapes names and discards extra metadata', async () => {
  const { renderWelcome } = await import(pathToFileURL(rendererPath));
  const html = renderWelcome({
    state: 'connected',
    collections: [{ name: 'A&B <Ops>', contentCount: 2, id: 'secret' }],
  });
  assert.match(html, /A&amp;B &lt;Ops&gt;/);
  assert.match(html, /2 content items/);
  assert.doesNotMatch(html, /secret/);
  assert.doesNotMatch(html, /<button|<script|<form|https?:\/\//i);
});

test('renderer neutralizes Unicode bidi controls as visible inert text', async () => {
  const { renderWelcome } = await import(pathToFileURL(rendererPath));
  const html = renderWelcome({
    state: 'connected',
    collections: [{ name: 'Ops\u202E<script>', contentCount: 1 }],
  });
  assert.match(html, /Ops⟪U\+202E⟫&lt;script&gt;/);
  assert.doesNotMatch(html, /\u202E/u);
});

test('renderer covers connected, empty, and unavailable states', async () => {
  const { renderWelcome } = await import(pathToFileURL(rendererPath));
  const connected = renderWelcome({ state: 'connected', collections: [{ name: 'People', contentCount: 1 }] });
  assert.match(connected, /Connected/);
  assert.match(connected, /1 content item/);
  assert.match(connected, /Continuing with your request/);

  const empty = renderWelcome({ state: 'empty', collections: [] });
  assert.match(empty, /No knowledge collections are currently available to you\./);

  const unavailable = renderWelcome({ state: 'unavailable', collections: [] });
  assert.match(unavailable, /Knowledge availability could not be loaded right now\./);
});

test('renderer rejects invalid states, names, counts, and state collections', async () => {
  const { renderWelcome } = await import(pathToFileURL(rendererPath));
  const invalid = [
    null,
    { state: 'other', collections: [] },
    { state: 'connected', collections: [] },
    { state: 'empty', collections: [{ name: 'Unexpected' }] },
    { state: 'unavailable', collections: [{ name: 'Unexpected' }] },
    { state: 'connected', collections: [{ name: '   ' }] },
    { state: 'connected', collections: [{ name: 'A', contentCount: -1 }] },
    { state: 'connected', collections: [{ name: 'A', contentCount: 1.5 }] },
    { state: 'connected', collections: 'not-an-array' },
  ];
  for (const input of invalid) assert.throws(() => renderWelcome(input), /invalid|require(?:s)?|must/i);
});

test('CLI output is identical to the exported renderer', async (t) => {
  const { renderWelcome } = await import(pathToFileURL(rendererPath));
  const directory = mkdtempSync(resolve(tmpdir(), 'aegis-welcome-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const inputPath = resolve(directory, 'input.json');
  const outputPath = resolve(directory, 'welcome.html');
  const input = { state: 'connected', collections: [{ name: 'Operations', contentCount: 3 }] };
  writeFileSync(inputPath, JSON.stringify(input));
  const result = spawnSync(process.execPath, [rendererPath, '--input', inputPath, '--output', outputPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(outputPath, 'utf8'), renderWelcome(input));
});

test('template is static, accessible, local, and reduced-motion aware', () => {
  const template = readFileSync(templatePath, 'utf8');
  assert.match(template, /Aegis Agentics/);
  assert.match(template, /role="status"/);
  assert.match(template, /aria-live="polite"/);
  assert.match(template, /prefers-reduced-motion/);
  assert.match(template, /Continuing with your request/);
  assert.doesNotMatch(template, /<button|<script|<form|https?:\/\//i);
  assert.doesNotMatch(template, /\bRun\b/);
});
