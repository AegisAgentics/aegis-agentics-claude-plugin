import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const template = readFileSync(new URL('../assets/welcome-template.html', import.meta.url), 'utf8');
const states = new Set(['connected', 'empty', 'unavailable']);

const neutralizeUnicodeControls = (value) => String(value).replace(
  /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
  (character) => `⟪U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟫`,
);

const escapeHtml = (value) => neutralizeUnicodeControls(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const validateInput = (input) => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Invalid welcome input: an object is required.');
  }
  if (!states.has(input.state)) throw new TypeError('Invalid welcome state.');
  if (!Array.isArray(input.collections)) throw new TypeError('Welcome collections must be an array.');
  if (input.state === 'connected' && input.collections.length === 0) {
    throw new TypeError('Connected state requires at least one collection.');
  }
  if (input.state !== 'connected' && input.collections.length !== 0) {
    throw new TypeError('Non-connected states require an empty collection list.');
  }
  return input.collections.map((collection) => {
    if (collection === null || typeof collection !== 'object' || Array.isArray(collection)) {
      throw new TypeError('Invalid collection.');
    }
    if (typeof collection.name !== 'string' || collection.name.trim() === '') {
      throw new TypeError('Collection name must be a non-empty string.');
    }
    if (collection.contentCount !== undefined
      && (!Number.isSafeInteger(collection.contentCount) || collection.contentCount < 0)) {
      throw new TypeError('Collection content count must be a safe non-negative integer.');
    }
    return { name: collection.name.trim(), contentCount: collection.contentCount };
  });
};

const stateCopy = {
  connected: {
    className: 'connected',
    label: 'Connected',
    headline: 'Your authorized knowledge is ready',
    summary: 'Aegis Agentics will answer from the organizational knowledge available to you.',
  },
  empty: {
    className: 'empty',
    label: 'Connected',
    headline: 'No knowledge available yet',
    summary: 'No knowledge collections are currently available to you.',
  },
  unavailable: {
    className: 'unavailable',
    label: 'Unavailable',
    headline: 'Knowledge is temporarily unavailable',
    summary: 'Knowledge availability could not be loaded right now.',
  },
};

const renderCollections = (collections) => {
  if (collections.length === 0) return '';
  const items = collections.map(({ name, contentCount }) => {
    const count = contentCount === undefined
      ? ''
      : `<span class="count">${contentCount.toLocaleString('en-US')} ${contentCount === 1 ? 'content item' : 'content items'}</span>`;
    return `<li class="collection"><span>${escapeHtml(name)}</span>${count}</li>`;
  }).join('');
  return `<ul class="collections" aria-label="Available knowledge collections">${items}</ul>`;
};

export function renderWelcome(input) {
  const collections = validateInput(input);
  const copy = stateCopy[input.state];
  const replacements = {
    '{{STATUS_CLASS}}': copy.className,
    '{{STATUS_LABEL}}': copy.label,
    '{{HEADLINE}}': copy.headline,
    '{{SUMMARY}}': copy.summary,
    '{{COLLECTIONS}}': renderCollections(collections),
  };
  let html = template;
  for (const [token, value] of Object.entries(replacements)) html = html.replaceAll(token, value);
  return html;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') {
    console.error('Usage: node render-welcome.mjs --input <input.json> --output <output.html>');
    process.exitCode = 2;
  } else {
    try {
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      writeFileSync(args[3], renderWelcome(input));
    } catch (error) {
      console.error(`Unable to render welcome: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
