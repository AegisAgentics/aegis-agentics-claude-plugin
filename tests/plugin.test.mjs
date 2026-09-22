import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
const pluginRoot = resolve(repositoryRoot, 'plugins/aegis-agentics');

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
    metadata: { description: 'Aegis Agentics local plugins.' },
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
  assert.equal('displayName' in plugin, false);
  assert.equal(plugin.version, pkg.version);
  assert.equal(marketplace.plugins[0].version, pkg.version);
  assert.equal(marketplace.plugins[0].source, './plugins/aegis-agentics');
});

test('marketplace root uses only Claude-supported metadata keys', () => {
  const marketplace = readJson(resolve(repositoryRoot, '.claude-plugin/marketplace.json'));
  assert.deepEqual(Object.keys(marketplace).sort(), ['metadata', 'name', 'owner', 'plugins']);
  assert.equal(marketplace.metadata.description, 'Aegis Agentics local plugins for governed organizational knowledge.');
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

test('installed plugin contains exactly two visible and two hidden skills', () => {
  const skillFiles = walkFiles(pluginRoot)
    .filter((file) => file.startsWith('skills/') && file.endsWith('/SKILL.md'));
  assert.deepEqual(skillFiles, [
    'skills/interaction-reference/SKILL.md',
    'skills/knowledge-search/SKILL.md',
    'skills/status/SKILL.md',
    'skills/welcome_user/SKILL.md',
  ]);
  const metadata = Object.fromEntries(skillFiles.map((file) => {
    const parsed = parseFrontmatter(readFileSync(resolve(pluginRoot, file), 'utf8'));
    return [parsed.attributes.name, parsed.attributes['user-invocable']];
  }));
  assert.deepEqual(metadata, {
    'interaction-reference': 'false',
    'knowledge-search': undefined,
    status: undefined,
    welcome_user: 'false',
  });
});

test('documentation describes capability, authorization, and local lifecycle', () => {
  const rootReadme = readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8');
  const pluginReadme = readFileSync(resolve(pluginRoot, 'README.md'), 'utf8');
  const combined = `${rootReadme}\n${pluginReadme}`;
  assert.match(combined, /exactly two user-invocable skills/i);
  assert.match(combined, /`\/aegis-agentics:knowledge-search`/);
  assert.match(combined, /`\/aegis-agentics:status`/);
  assert.match(combined, /`interaction-reference`.*hidden.*not a command/is);
  assert.match(combined, /`welcome_user`.*hidden.*not a command/is);
  assert.match(combined, /authorization.*Control Tower connector/is);
  assert.match(combined, /installation does not authenticate/i);
  assert.match(combined, /claude plugin install aegis-agentics@aegis-agentics --scope user/);
  assert.match(combined, /claude plugin update aegis-agentics@aegis-agentics/);
  assert.match(combined, /claude plugin uninstall aegis-agentics@aegis-agentics --scope user/);
  assert.match(combined, /`\/aegis-agentics:status`.*verify/is);
  assert.match(combined, /no external web research/i);
  assert.match(combined, /strictly grounded in returned evidence/i);
});

test('package prose states boundaries without secrets, endpoints, raw links, or unfinished markers', () => {
  const prosePaths = [
    'README.md',
    'SECURITY.md',
    'LICENSE',
    'plugins/aegis-agentics/README.md',
    'plugins/aegis-agentics/SECURITY.md',
    'plugins/aegis-agentics/CHANGELOG.md',
  ];
  const prose = prosePaths.map((path) => readFileSync(resolve(repositoryRoot, path), 'utf8')).join('\n');
  assert.doesNotMatch(prose, /\b(?:FMCAP|investor|portfolio|Carta|PitchBook)\b/i);
  assert.doesNotMatch(prose, /\b(?:TODO|FIXME|TBD|XXX)\b/);
  assert.doesNotMatch(prose, /https?:\/\//i);
  assert.doesNotMatch(prose, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i);
  assert.doesNotMatch(prose, /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{20,})\b/);
  assert.match(prose, /contains no MCP server, endpoint settings, credentials, hooks, external research, or write operations/i);
});
