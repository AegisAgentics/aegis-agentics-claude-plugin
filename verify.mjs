import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPOSITORY_ROOT = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = 'plugins/aegis-agentics';
const EXPECTED_SKILLS = new Map([
  ['aegis-knowledge-search', false],
  ['aegis-status', false],
  ['interaction-reference', true],
]);
const ENDPOINT_FIELDS = /(?:^|[\n{,])\s*(?:["'](?:mcpServers|serverUrl|command|args)["']|(?:mcpServers|serverUrl|command|args))\s*:/im;
const EXTERNAL_RESEARCH_ACTION = /\b(?:use|call|run|perform|conduct|search|browse|look up)\b[^\n]{0,60}\b(?:public[- ]?web|web|internet|online|WebSearch|browser_search|search_web)\b/i;
const EXTERNAL_RESEARCH_NEGATION = /\b(?:do not|don't|never|no|without|must not|cannot|can't)\b[^\n]{0,80}\b(?:public[- ]?web|web|internet|online|WebSearch|browser_search|search_web)\b/i;
const ALLOWED_VIEWER_ORIGIN = 'https://app.aegisagentics.com';
const ALLOWED_VIEWER_ORIGIN_FILE = `${PLUGIN_ROOT}/skills/aegis-knowledge-search/SKILL.md`;

const toPosix = (path) => path.split(sep).join('/');
const add = (errors, condition, message) => {
  if (!condition) errors.push(message);
};
const containsProhibitedConfigKey = (value) => {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsProhibitedConfigKey);
  return Object.entries(value).some(([key, nested]) => (
    /^(?:mcpServers|serverUrl|command|args)$/i.test(key) || containsProhibitedConfigKey(nested)
  ));
};
const containsProhibitedUrl = (file, text) => {
  const urls = text.match(/https?:\/\/[^\s)<>{}"'`]+/gi) ?? [];
  return urls.some((url) => !(file === ALLOWED_VIEWER_ORIGIN_FILE && url === ALLOWED_VIEWER_ORIGIN));
};
const containsExternalResearchInstruction = (text) => text
  .replace(/browser\.search/gi, 'browser_search')
  .split(/[\n.!?;]+/)
  .some((clause) => EXTERNAL_RESEARCH_ACTION.test(clause) && !EXTERNAL_RESEARCH_NEGATION.test(clause));

export function parseFrontmatter(text) {
  const normalized = text.replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized);
  if (!match) throw new Error('missing frontmatter');
  const attributes = Object.fromEntries(match[1].split('\n').filter(Boolean).map((line) => {
    const index = line.indexOf(':');
    if (index < 1) throw new Error(`invalid frontmatter line: ${line}`);
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { attributes, body: match[2].replace(/^\n/, '') };
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`cannot parse JSON: ${path}`);
  }
}

export function assertPathWithin(root, candidate) {
  const absoluteRoot = resolve(root);
  const absoluteCandidate = resolve(candidate);
  const displacement = relative(absoluteRoot, absoluteCandidate);
  if (displacement === '..' || displacement.startsWith(`..${sep}`) || isAbsolute(displacement)) {
    throw new Error(`path is outside repository: ${absoluteCandidate}`);
  }
  return absoluteCandidate;
}

export function walkFiles(root) {
  const absoluteRoot = resolve(root);
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.git' || entry.name === '.superpowers') continue;
      const candidate = assertPathWithin(absoluteRoot, resolve(directory, entry.name));
      const relativePath = toPosix(relative(absoluteRoot, candidate));
      const stat = lstatSync(candidate);
      if (stat.isSymbolicLink()) {
        let destination;
        try {
          destination = realpathSync(candidate);
          assertPathWithin(absoluteRoot, destination);
        } catch {
          throw new Error(`symbolic link escapes repository: ${relativePath}`);
        }
        if (lstatSync(destination).isDirectory()) visit(destination);
        else files.push(relativePath);
      } else if (stat.isDirectory()) {
        visit(candidate);
      } else if (stat.isFile()) {
        files.push(relativePath);
      }
    }
  };
  visit(absoluteRoot);
  return files.sort();
}

export function validateRepository(root = REPOSITORY_ROOT) {
  const absoluteRoot = resolve(root);
  const errors = [];
  let files = [];
  try {
    files = walkFiles(absoluteRoot);
  } catch (error) {
    errors.push(error.message);
    return errors;
  }

  for (const required of [
    'package.json',
    '.claude-plugin/marketplace.json',
    `${PLUGIN_ROOT}/.claude-plugin/plugin.json`,
  ]) {
    add(errors, files.includes(required), `${required}: missing required file`);
  }
  if (errors.some((error) => error.includes('missing required file'))) return errors;

  let pkg;
  let marketplace;
  let plugin;
  try {
    pkg = readJson(resolve(absoluteRoot, 'package.json'));
    marketplace = readJson(resolve(absoluteRoot, '.claude-plugin/marketplace.json'));
    plugin = readJson(resolve(absoluteRoot, PLUGIN_ROOT, '.claude-plugin/plugin.json'));
  } catch (error) {
    errors.push(error.message);
    return errors;
  }

  add(errors, pkg.name === 'aegis-agentics-claude-plugin', 'package.json: unexpected package name');
  add(errors, pkg.engines?.node === '>=22', 'package.json: Node engine must be >=22');
  add(errors, plugin.name === 'aegis-agentics', 'plugin.json: unexpected plugin name');
  add(errors, !('displayName' in plugin), 'plugin.json: displayName is not supported by the Claude manifest schema');
  add(errors, plugin.skills === './skills/', 'plugin.json: skills path must be ./skills/');
  add(errors, plugin.version === pkg.version, 'plugin.json: version differs from package.json');
  add(errors, marketplace.plugins?.length === 1, 'marketplace.json: expected one local plugin');
  add(errors, marketplace.plugins?.[0]?.name === 'aegis-agentics', 'marketplace.json: unexpected plugin name');
  add(errors, marketplace.plugins?.[0]?.source === './plugins/aegis-agentics', 'marketplace.json: unexpected source');
  add(errors, marketplace.plugins?.[0]?.version === pkg.version, 'marketplace.json: version differs from package.json');

  const skillPrefix = `${PLUGIN_ROOT}/skills/`;
  const skillFiles = files.filter((file) => file.startsWith(skillPrefix) && file.endsWith('/SKILL.md'));
  const skillNames = skillFiles.map((file) => file.slice(skillPrefix.length, -'/SKILL.md'.length)).sort();
  add(
    errors,
    JSON.stringify(skillNames) === JSON.stringify([...EXPECTED_SKILLS.keys()].sort()),
    `skill inventory: expected exactly ${[...EXPECTED_SKILLS.keys()].sort().join(', ')}`,
  );

  for (const [name, hidden] of EXPECTED_SKILLS) {
    const relativePath = `${skillPrefix}${name}/SKILL.md`;
    if (!files.includes(relativePath)) continue;
    try {
      const parsed = parseFrontmatter(readFileSync(resolve(absoluteRoot, relativePath), 'utf8'));
      add(errors, parsed.attributes.name === name, `${relativePath}: frontmatter name must match directory`);
      if (hidden) {
        add(errors, parsed.attributes['user-invocable'] === 'false', `${relativePath}: hidden skill must set user-invocable: false`);
      } else {
        add(errors, !('user-invocable' in parsed.attributes), `${relativePath}: visible skill must not set user-invocable`);
      }
    } catch (error) {
      errors.push(`${relativePath}: ${error.message}`);
    }
  }

  for (const file of files.filter((path) => path.startsWith(`${PLUGIN_ROOT}/`))) {
    if (file.endsWith('/.mcp.json') || file === `${PLUGIN_ROOT}/.mcp.json`) {
      errors.push(`${file}: packaged MCP configuration is prohibited`);
      continue;
    }
    const path = resolve(absoluteRoot, file);
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    let prohibitedJsonConfig = false;
    if (file.endsWith('.json')) {
      try {
        prohibitedJsonConfig = containsProhibitedConfigKey(JSON.parse(text));
      } catch {
        prohibitedJsonConfig = false;
      }
    }
    if (containsProhibitedUrl(file, text) || ENDPOINT_FIELDS.test(text) || prohibitedJsonConfig) {
      errors.push(`${file}: contains prohibited connector configuration`);
    }
    if (file.startsWith(skillPrefix) && containsExternalResearchInstruction(text)) {
      errors.push(`${file}: contains external research instruction`);
    }
  }

  return errors;
}

export function runVerification(root = REPOSITORY_ROOT) {
  const errors = validateRepository(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    return false;
  }
  console.log('Aegis Agentics plugin verification passed.');
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = runVerification() ? 0 : 1;
}
