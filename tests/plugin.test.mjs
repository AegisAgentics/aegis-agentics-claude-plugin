import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import * as verification from '../verify.mjs';
import {
  assertPathWithin,
  parseFrontmatter,
  readJson,
  validateRepository,
  walkFiles,
} from '../verify.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');

const write = (root, relativePath, contents) => {
  const path = resolve(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
};

const makeFixture = (t, mutate = () => {}) => {
  const root = mkdtempSync(resolve(tmpdir(), 'aegis-agentics-plugin-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, 'package.json', JSON.stringify({
    name: 'aegis-agentics-claude-plugin',
    version: '0.1.0',
    private: true,
    license: 'UNLICENSED',
    type: 'module',
    engines: { node: '>=22' },
    scripts: { test: 'node --test', verify: 'node verify.mjs' },
  }));
  write(root, '.claude-plugin/marketplace.json', JSON.stringify({
    name: 'aegis-agentics',
    owner: { name: 'Aegis Agentics' },
    description: 'Aegis Agentics local plugins.',
    plugins: [{
      name: 'aegis-agentics',
      description: 'Evidence-grounded answers from authorized organizational knowledge.',
      version: '0.1.0',
      source: './plugins/aegis-agentics',
      category: 'productivity',
    }],
  }));
  write(root, 'plugins/aegis-agentics/.claude-plugin/plugin.json', JSON.stringify({
    name: 'aegis-agentics',
    displayName: 'Aegis Agentics',
    version: '0.1.0',
    description: 'Evidence-grounded answers from authorized organizational knowledge.',
    author: { name: 'Aegis Agentics' },
    license: 'UNLICENSED',
    keywords: ['knowledge', 'citations', 'governed-data', 'organizational-intelligence'],
    skills: './skills/',
  }));
  for (const [name, hidden] of [
    ['interaction-reference', true],
    ['knowledge-search', false],
    ['status', false],
    ['welcome_user', true],
  ]) {
    const visibility = hidden ? 'user-invocable: false\n' : '';
    write(root, `plugins/aegis-agentics/skills/${name}/SKILL.md`,
      `---\nname: ${name}\ndescription: Test skill.\n${visibility}---\n\nRead-only collection guidance.\n`);
  }
  mutate(root);
  return root;
};

test('verification exposes only the validator contract', () => {
  assert.deepEqual(Object.keys(verification).sort(), [
    'assertPathWithin',
    'parseFrontmatter',
    'readJson',
    'runVerification',
    'validateRepository',
    'walkFiles',
  ]);
});

test('package and plugin identities are stable', () => {
  const pkg = readJson(resolve(repositoryRoot, 'package.json'));
  const plugin = readJson(resolve(repositoryRoot, 'plugins/aegis-agentics/.claude-plugin/plugin.json'));
  const marketplace = readJson(resolve(repositoryRoot, '.claude-plugin/marketplace.json'));
  assert.equal(pkg.name, 'aegis-agentics-claude-plugin');
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(plugin.name, 'aegis-agentics');
  assert.equal(plugin.displayName, 'Aegis Agentics');
  assert.equal(plugin.version, pkg.version);
  assert.equal(marketplace.plugins[0].version, pkg.version);
  assert.equal(marketplace.plugins[0].source, './plugins/aegis-agentics');
});

test('frontmatter parser returns scalar metadata and body', () => {
  const parsed = parseFrontmatter('---\nname: status\ndescription: Status\n---\n\nRead-only.\n');
  assert.deepEqual(parsed.attributes, { name: 'status', description: 'Status' });
  assert.equal(parsed.body, 'Read-only.\n');
});

test('walkFiles returns sorted repository-relative paths', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'aegis-walk-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, 'z.txt', 'z');
  write(root, 'a/b.txt', 'b');
  write(root, '.git/config', 'ignored');
  assert.deepEqual(walkFiles(root), ['a/b.txt', 'z.txt']);
});

test('path containment rejects paths outside the repository', () => {
  assert.throws(() => assertPathWithin('/safe/root', '/safe/outside'), /outside repository/i);
});

test('repository validation accepts the minimal four-skill contract', (t) => {
  assert.deepEqual(validateRepository(makeFixture(t)), []);
});

test('repository validation rejects packaged MCP configuration', (t) => {
  const root = makeFixture(t, (fixture) => write(fixture, 'plugins/aegis-agentics/.mcp.json', '{}'));
  assert.ok(validateRepository(root).some((error) => error.includes('.mcp.json')));
});

test('repository validation rejects connector endpoints and settings', (t) => {
  const root = makeFixture(t, (fixture) => write(
    fixture,
    'plugins/aegis-agentics/README.md',
    'Connect at https://connector.example/mcp with {"serverUrl":"hidden"}.',
  ));
  assert.ok(validateRepository(root).some((error) => error.includes('prohibited connector configuration')));
});

test('repository validation allows tool_args payloads and local args variables', (t) => {
  const root = makeFixture(t, (fixture) => {
    write(
      fixture,
      'plugins/aegis-agentics/skills/status/SKILL.md',
      '---\nname: status\ndescription: Status.\n---\n\nUse `{ "tool_args": {} }`.\n',
    );
    write(fixture, 'plugins/aegis-agentics/local.mjs', 'const args = process.argv.slice(2);\n');
  });
  assert.deepEqual(validateRepository(root), []);
});

test('repository validation rejects symlink escapes', (t) => {
  const root = makeFixture(t);
  const outside = resolve(root, '..', `${root.split('/').at(-1)}-outside.txt`);
  writeFileSync(outside, 'outside');
  t.after(() => rmSync(outside, { force: true }));
  symlinkSync(outside, resolve(root, 'plugins/aegis-agentics/escape.txt'));
  assert.ok(validateRepository(root).some((error) => error.includes('symbolic link escapes repository')));
});

test('repository validation rejects additional skill directories', (t) => {
  const root = makeFixture(t, (fixture) => write(
    fixture,
    'plugins/aegis-agentics/skills/extra/SKILL.md',
    '---\nname: extra\ndescription: Extra.\n---\n',
  ));
  assert.ok(validateRepository(root).some((error) => error.includes('skill inventory')));
});

test('repository validation rejects external-research instructions in skills', (t) => {
  for (const phrase of ['WebSearch', 'public-web research']) {
    const root = makeFixture(t, (fixture) => write(
      fixture,
      'plugins/aegis-agentics/skills/status/SKILL.md',
      `---\nname: status\ndescription: Status.\n---\n\nUse ${phrase}.\n`,
    ));
    assert.ok(validateRepository(root).some((error) => error.includes('external research instruction')));
  }
});
