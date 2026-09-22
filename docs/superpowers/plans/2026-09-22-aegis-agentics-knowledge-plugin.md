# Aegis Agentics Knowledge Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Claude plugin branded Aegis Agentics with visible `knowledge-search` and `status` skills plus hidden `interaction-reference` and `welcome_user` skills.

**Architecture:** Create a dependency-free Node 22 package patterned after the validated FMCAP plugin, while replacing every investment-specific rule with collection-grounded organizational knowledge behavior. Shared turn, authorization, selection, citation, and safety policy lives in one hidden reference; the welcome is a separately tested static renderer; visible skills contain only their routing and response contracts.

**Tech Stack:** Claude plugin manifests and Markdown skills, Node.js >=22 ES modules, `node:test`, static HTML/CSS, no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-aegis-agentics-knowledge-plugin-design.md`

## Global Constraints

- Work only in `/home/aegisagentics/controltower/aegis-agentics-claude-plugin`.
- Keep all work local; do not push, publish, deploy, register externally, or install into another user's environment.
- The plugin is strictly grounded in authorized Control Tower collections and performs no public-web research.
- The plugin is read-only and packages no MCP endpoint, credentials, connector configuration, or write operation.
- Visible skills are exactly `knowledge-search` and `status`.
- Hidden skills are exactly `interaction-reference` and `welcome_user`, both with `user-invocable: false`.
- Use one selected authorized collection for retrieval; never perform an unrestricted all-collection knowledge search.
- Preserve returned citation destinations exactly and never construct viewer paths from identifiers.
- Use Node.js `>=22` and add no third-party package dependency.

## Review Focus

- A first request with a failed `begin_turn` must show the unavailable welcome once and must not retry or leak technical details; Task 4 pins this behavior.
- An explicitly named collection on the first request must use the unfiltered welcome bootstrap only for resolution and must not expose unrelated collections in the status answer; Task 3 pins this behavior.
- Distinct locators from the same document must receive distinct citation numbers, while an identical reference is reused; Task 3 pins this behavior.
- Collection names containing HTML or Unicode control-like text must be escaped and rendered as text, never markup; Task 4 pins this behavior.
- Repository validation must reject symlink escapes, packaged endpoints, extra skills, and web-research instructions; Task 1 pins these behaviors.

---

## File map

- `package.json` — dependency-free Node package identity and test commands.
- `verify.mjs` — manifest, file inventory, path containment, frontmatter, prohibited-content, and skill-visibility validation.
- `.claude-plugin/marketplace.json` — local marketplace metadata used only to install/test this folder locally; it is not an external registration.
- `plugins/aegis-agentics/.claude-plugin/plugin.json` — installed plugin identity.
- `plugins/aegis-agentics/README.md` — user-facing capability, installation, and connector prerequisite documentation.
- `plugins/aegis-agentics/SECURITY.md` — read-only, credential, incident, and safe-failure policy.
- `plugins/aegis-agentics/CHANGELOG.md` — local version history.
- `plugins/aegis-agentics/skills/interaction-reference/SKILL.md` — hidden shared policy.
- `plugins/aegis-agentics/skills/knowledge-search/SKILL.md` — visible retrieval and citation workflow.
- `plugins/aegis-agentics/skills/status/SKILL.md` — visible collection availability workflow.
- `plugins/aegis-agentics/skills/welcome_user/SKILL.md` — hidden first-request presentation policy.
- `plugins/aegis-agentics/skills/welcome_user/assets/welcome-template.html` — fixed accessible artifact markup and styling.
- `plugins/aegis-agentics/skills/welcome_user/scripts/render-welcome.mjs` — validated renderer with HTML escaping.
- `tests/plugin.test.mjs` — packaging, inventory, visibility, and validator tests.
- `tests/content.test.mjs` — workflow, grounding, citation, selection, and prohibited-behavior contract tests.
- `tests/welcome.test.mjs` — renderer and first-request welcome tests.

### Task 1: Package skeleton and repository validator

**Files:**
- Create: `package.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `plugins/aegis-agentics/.claude-plugin/plugin.json`
- Create: `verify.mjs`
- Create: `tests/plugin.test.mjs`

**Interfaces:**
- Consumes: Node.js `>=22` standard library only.
- Produces: `parseFrontmatter(text)`, `readJson(path)`, `walkFiles(root)`, `assertPathWithin(root, candidate)`, `validateRepository(root)`, and `runVerification(root)` from `verify.mjs`.

- [ ] **Step 1: Write failing package and validator tests**

Create `tests/plugin.test.mjs` with tests asserting exact package metadata and the local marketplace/plugin version match. Test validator primitives against temporary fixture trees: rejection of `.mcp.json`, `http://`/`https://` connector endpoints in packaged policy, symlink escapes, extra skill directories, and the phrases `WebSearch` or `public-web research` in skills. Add the installed four-skill inventory assertion in Task 5, after all skills exist.

```js
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { parseFrontmatter, readJson, validateRepository, walkFiles } from '../verify.mjs';

test('package and plugin identities are stable', () => {
  const pkg = readJson(resolve('package.json'));
  const plugin = readJson(resolve('plugins/aegis-agentics/.claude-plugin/plugin.json'));
  assert.equal(pkg.name, 'aegis-agentics-claude-plugin');
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(plugin.name, 'aegis-agentics');
  assert.equal(plugin.displayName, 'Aegis Agentics');
  assert.equal(plugin.version, pkg.version);
});

test('frontmatter parser returns scalar metadata and body', () => {
  const parsed = parseFrontmatter('---\nname: status\ndescription: Status\n---\n\nRead-only.\n');
  assert.deepEqual(parsed.attributes, { name: 'status', description: 'Status' });
  assert.equal(parsed.body, 'Read-only.\n');
});
```

- [ ] **Step 2: Run the package test and verify it fails**

Run: `node --test tests/plugin.test.mjs`

Expected: FAIL because `verify.mjs` and manifests do not exist.

- [ ] **Step 3: Implement package metadata and manifests**

Create `package.json`:

```json
{
  "name": "aegis-agentics-claude-plugin",
  "version": "0.1.0",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": { "test": "node --test", "verify": "node verify.mjs" }
}
```

Create the plugin manifest with `name: aegis-agentics`, `displayName: Aegis Agentics`, version `0.1.0`, description `Evidence-grounded answers from authorized organizational knowledge.`, author `Aegis Agentics`, keywords `knowledge`, `citations`, `governed-data`, `organizational-intelligence`, and `skills: ./skills/`. Create matching local marketplace metadata pointing to `./plugins/aegis-agentics`.

- [ ] **Step 4: Implement the validator**

Implement `verify.mjs` with the six exported functions. `walkFiles` must sort relative paths, reject symbolic links that resolve outside the repository, and ignore `.git`. `validateRepository` must verify JSON, exact skill inventory, frontmatter name-directory equality, hidden visibility, version agreement, absence of `.mcp.json`, absence of endpoint/config fields (`mcpServers`, `serverUrl`, `command`, `args`), absence of external-research instructions in skills, and paths contained within the repository.

```js
export const parseFrontmatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('missing frontmatter');
  const attributes = Object.fromEntries(match[1].split('\n').filter(Boolean).map((line) => {
    const index = line.indexOf(':');
    if (index < 1) throw new Error(`invalid frontmatter line: ${line}`);
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { attributes, body: match[2].replace(/^\n/, '') };
};
```

- [ ] **Step 5: Run validator tests**

Run: `node --test tests/plugin.test.mjs`

Expected: PASS. Full-repository verification is intentionally deferred until the four skills and documentation exist.

- [ ] **Step 6: Commit locally**

```bash
git init
git add package.json .claude-plugin plugins/aegis-agentics/.claude-plugin verify.mjs tests/plugin.test.mjs
git commit -m "chore: scaffold Aegis Agentics Claude plugin"
```

Do not add a remote and do not push.

### Task 2: Shared interaction policy and status skill

**Files:**
- Create: `plugins/aegis-agentics/skills/interaction-reference/SKILL.md`
- Create: `plugins/aegis-agentics/skills/status/SKILL.md`
- Create: `tests/content.test.mjs`

**Interfaces:**
- Consumes: gateway `begin_turn` and direct `context-hub.queryCollections` execution contract.
- Produces: shared session/turn policy and fixed status responses for available, empty, and unavailable collection states.

- [ ] **Step 1: Write failing shared-policy and status tests**

Create `tests/content.test.mjs` asserting:

```js
test('interaction policy preserves one conversation session and fresh turn tokens', () => {
  const text = skill('interaction-reference');
  assert.match(text, /recover the most recent valid `sessionId`/i);
  assert.match(text, /call `begin_turn` once per eligible user request/i);
  assert.match(text, /never decode, edit, print, persist, or reuse/i);
  assert.match(text, /"pluginId": "aegis-agentics"/i);
  assert.match(text, /never execute an all-collections knowledge search/i);
});

test('status distinguishes returned, empty, and unavailable states', () => {
  const text = skill('status');
  assert.match(text, /\*\*Available knowledge\*\*/);
  assert.match(text, /No knowledge collections are currently available to you\./);
  assert.match(text, /Your knowledge collections could not be loaded right now\./);
});
```

Also assert direct structured-content parsing before fallback, no prose scraping, reuse of an earlier authorized list, named-scope isolation on first-request bootstrap, prohibition of connector discovery/provider tools/write operations, and no raw IDs or tokens in responses.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/content.test.mjs`

Expected: FAIL because the skills do not exist.

- [ ] **Step 3: Write `interaction-reference`**

Use this exact frontmatter:

```yaml
---
name: interaction-reference
description: Shared Aegis Agentics turn, scope, citation, safety, and response rules.
user-invocable: false
---
```

Define: one `begin_turn` per eligible request; recovery of the prior conversation `sessionId`; fresh opaque `turnToken`; `clientAttribution` containing `claude_desktop`, `claude_desktop_chat`, `aegis-agentics`, and manifest version `0.1.0`; first-request collection bootstrap; reuse thereafter; structured-result-first parsing; one selected collection; no all-collection retrieval; no discovery fallback; prompt-injection resistance; read-only boundaries; and business-language failures.

- [ ] **Step 4: Write `status`**

Use this exact frontmatter:

```yaml
---
name: status
description: Show the authorized organizational knowledge collections currently available to the user.
---
```

Allow only `begin_turn` and direct `context-hub.queryCollections`. Reuse the welcome bootstrap list. Define exact available, empty, and unavailable response contracts. Ensure a named collection reports only matching authorized results even though the welcome bootstrap was unfiltered.

- [ ] **Step 5: Run content and validator tests**

Run: `node --test tests/content.test.mjs tests/plugin.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit locally**

```bash
git add plugins/aegis-agentics/skills/interaction-reference plugins/aegis-agentics/skills/status tests/content.test.mjs
git commit -m "feat: add shared governance and status skills"
```

### Task 3: Knowledge retrieval and citation skill

**Files:**
- Create: `plugins/aegis-agentics/skills/knowledge-search/SKILL.md`
- Modify: `tests/content.test.mjs`

**Interfaces:**
- Consumes: shared `interaction-reference`, selected collection metadata, `context-hub.queryContent`, and `context-hub.queryFacts`.
- Produces: collection-grounded answers with sequential claim-level citations.

- [ ] **Step 1: Add failing retrieval tests**

Add tests asserting content/fact/combined routing, parallel independent calls, exact call shapes, collection ID placement inside `tool_args`, session/token placement at the top level, preservation of proper names and temporal language, entity disambiguation, and strict grounding.

```js
test('knowledge search routes content, facts, and mixed questions', () => {
  const text = skill('knowledge-search');
  assert.match(text, /source passages.*`context-hub\.queryContent`/is);
  assert.match(text, /relationships.*`context-hub\.queryFacts`/is);
  assert.match(text, /needs both.*execute both/is);
  assert.match(text, /run them in parallel/i);
});

test('citation contract preserves exact returned destinations', () => {
  const text = skill('knowledge-search');
  assert.match(text, /assign citation numbers in order of first use/i);
  assert.match(text, /reuse the same number for an exact repeated reference/i);
  assert.match(text, /different numbers for distinct locators/i);
  assert.match(text, /copy `viewerUrl` exactly, character for character/i);
  assert.match(text, /do not construct a viewer path from IDs/i);
});
```

Also test no model-knowledge gap filling, no web research, no generic follow-up prompts, exact quote handling, stale evidence, conflicts, absent links, and the two no-evidence responses.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/content.test.mjs --test-name-pattern="knowledge|citation|grounding"`

Expected: FAIL because `knowledge-search/SKILL.md` does not exist.

- [ ] **Step 3: Implement the retrieval workflow**

Use this frontmatter:

```yaml
---
name: knowledge-search
description: Answer authorized document, fact, relationship, policy, meeting, and chronology questions with source citations.
---
```

Require loading `interaction-reference`. Permit only one `begin_turn` and direct `queryCollections`, `queryContent`, and `queryFacts` operations. Include exact gateway examples:

```json
{
  "server_id": "context-hub",
  "tool_name": "queryContent",
  "tool_args": { "query": "<complete user request>", "collectionId": "<selected collection ID>" },
  "session_id": "<current session ID>",
  "turnToken": "<current turn token>"
}
```

and the corresponding `queryFacts` shape with a concise fact-focused query. Define source/fact authority, entity ambiguity, conflict behavior, exact quotation behavior, temporal handling, and narrow-answer behavior.

- [ ] **Step 4: Implement citation and response contracts**

Specify sequential `[1](viewerUrl)` Markdown citations placed immediately after supported claims; exact-reference deduplication; distinct-locator preservation; and opaque URL handling. Copy absolute returned viewer URLs unchanged. When a returned `viewerUrl` begins with `/`, prefix that unchanged path once with `https://app.aegisagentics.com`. Use a label-only fallback when no usable link exists. Also define inference labeling and response-first prose without raw mechanics.

- [ ] **Step 5: Run all content tests**

Run: `node --test tests/content.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit locally**

```bash
git add plugins/aegis-agentics/skills/knowledge-search tests/content.test.mjs
git commit -m "feat: add grounded knowledge search skill"
```

### Task 4: One-time Aegis Agentics welcome

**Files:**
- Create: `plugins/aegis-agentics/skills/welcome_user/SKILL.md`
- Create: `plugins/aegis-agentics/skills/welcome_user/assets/welcome-template.html`
- Create: `plugins/aegis-agentics/skills/welcome_user/scripts/render-welcome.mjs`
- Create: `tests/welcome.test.mjs`
- Modify: `plugins/aegis-agentics/skills/interaction-reference/SKILL.md`
- Modify: `plugins/aegis-agentics/skills/status/SKILL.md`
- Modify: `plugins/aegis-agentics/skills/knowledge-search/SKILL.md`

**Interfaces:**
- Consumes: `{ state: 'connected'|'empty'|'unavailable', collections: Array<{name: string, contentCount?: number}> }`.
- Produces: `renderWelcome(input): string` and CLI `render-welcome.mjs --input file --output file`.

- [ ] **Step 1: Write failing welcome tests**

Test exactly-once/automatic continuation rules, first-request `begin_turn` failure, no-repeat behavior, collection-list reuse, connected/empty/unavailable states, HTML escaping, invalid names/counts/states, extra-field non-disclosure, CLI parity, reduced-motion CSS, and absence of buttons, scripts, forms, remote URLs, or the word `Run`.

```js
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
```

- [ ] **Step 2: Run welcome tests and verify failure**

Run: `node --test tests/welcome.test.mjs`

Expected: FAIL because the renderer and welcome skill do not exist.

- [ ] **Step 3: Implement the renderer**

Implement strict object validation, `connected` requiring at least one collection, non-connected states requiring none, non-empty trimmed names, safe non-negative integer counts, `escapeHtml`, localized counts, and fixed token replacement. Export `renderWelcome` and implement the four-argument CLI.

```js
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
```

- [ ] **Step 4: Implement the static template**

Create an accessible card with a typographic `Aegis Agentics` wordmark, status dot, headline, summary, collection list, and `Continuing with your request`. Use only embedded CSS, system fonts, no script, no remote resource, no interaction, and a `prefers-reduced-motion` rule.

- [ ] **Step 5: Implement `welcome_user` and integrate the gate**

Use frontmatter:

```yaml
---
name: welcome_user
description: Shared first-request welcome presentation for Aegis Agentics conversations.
user-invocable: false
---
```

Define the exact renderer input, one Artifact attempt, concise text fallback, exactly-once semantics, and automatic continuation. Update the shared reference and both visible skills to load it only when the first-request gate requires it. A failed first `begin_turn` renders unavailable once without querying collections; a successful first turn performs one unfiltered collection lookup for the welcome and reuses it for the active skill.

- [ ] **Step 6: Run welcome and full tests**

Run: `npm test && npm run verify`

Expected: PASS.

- [ ] **Step 7: Commit locally**

```bash
git add plugins/aegis-agentics/skills tests/welcome.test.mjs
git commit -m "feat: add one-time Aegis Agentics welcome"
```

### Task 5: Documentation, security review, and clean verification

**Files:**
- Create: `README.md`
- Create: `SECURITY.md`
- Create: `LICENSE`
- Create: `plugins/aegis-agentics/README.md`
- Create: `plugins/aegis-agentics/SECURITY.md`
- Create: `plugins/aegis-agentics/CHANGELOG.md`
- Modify: `tests/plugin.test.mjs`
- Modify: `tests/content.test.mjs`

**Interfaces:**
- Consumes: completed plugin behavior.
- Produces: local installation/verification guidance and final invariant checks.

- [ ] **Step 1: Add failing documentation/invariant tests**

Assert documentation names exactly two visible skills, explains the two hidden skills without exposing them as commands, documents connector-based authorization, states that installation does not authenticate, includes local install/update/uninstall commands, states no web research and strict evidence grounding, and contains no FMCAP/investor/portfolio/Carta/PitchBook language. Add a whole-tree scan for credentials, endpoint configuration, unfinished-work markers, and raw viewer URLs in prose.

- [ ] **Step 2: Run documentation tests and verify failure**

Run: `node --test tests/plugin.test.mjs tests/content.test.mjs`

Expected: FAIL because documentation is absent.

- [ ] **Step 3: Write root and installed-plugin documentation**

Document purpose, exact skill inventory, prerequisites, local installation, graphical connector authentication, verification with `/aegis-agentics:status`, updates, uninstallation, limitations, and support boundaries. State that the package contains no MCP server, endpoint settings, credentials, hooks, external research, or write operations.

- [ ] **Step 4: Write security and changelog files**

Define private local status, credential prohibition, prompt-injection handling, read-only guarantees, safe failure, incident-report sanitization, and version `0.1.0`. Use an `UNLICENSED` private-use notice.

- [ ] **Step 5: Run the complete verification matrix**

Run:

```bash
npm test
npm run verify
rg -n -i 'FMCAP|investor|portfolio|Carta|PitchBook|WebSearch|public-web research' \
  plugins tests README.md SECURITY.md
git status --short
git diff --check
```

Expected: tests and verifier PASS; prohibited-language scan returns no matches except explicit negative assertions in tests; `git diff --check` returns no output; only intended local files are changed.

- [ ] **Step 6: Perform a clean-room local installation check**

Run the Claude plugin validator/install command available in the environment against this folder without publishing it. Confirm the menu exposes only `knowledge-search` and `status`; do not connect an account, alter another user's configuration, publish a marketplace, or deploy.

- [ ] **Step 7: Commit locally**

```bash
git add README.md SECURITY.md LICENSE plugins/aegis-agentics tests
git commit -m "docs: complete local Aegis Agentics plugin package"
```

Do not configure a Git remote and do not push.
