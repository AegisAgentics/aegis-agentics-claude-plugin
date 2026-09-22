import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const pluginRoot = resolve(import.meta.dirname, '../plugins/aegis-agentics');
const interactionPath = resolve(pluginRoot, 'skills/interaction-reference/SKILL.md');
const statusPath = resolve(pluginRoot, 'skills/aegis-status/SKILL.md');

test('plugin does not package an Artifact-based welcome skill', () => {
  assert.equal(existsSync(resolve(pluginRoot, 'skills/welcome_user')), false);
});

test('shared interaction rules bootstrap the connector-owned MCP App once', () => {
  const interaction = readFileSync(interactionPath, 'utf8');
  assert.match(interaction, /call `welcome_user`[^\n]*exactly once/i);
  assert.match(interaction, /same top-level `session_id` and returned `turnToken`/i);
  assert.match(interaction, /MCP App[^\n]*automatically/i);
  assert.match(interaction, /continue (?:the )?original request automatically/i);
  assert.match(interaction, /do not create[^\n]*Artifact/i);
  assert.match(interaction, /do not call `execute_tool` for `context-hub\.queryCollections` during that bootstrap/i);
  assert.match(interaction, /reuse[^\n]*authorized collection list/i);
  assert.match(interaction, /later Aegis Agentics requests[^\n]*must not repeat[^\n]*bootstrap/i);
});

test('successful begin_turn display summary does not block the welcome bootstrap', () => {
  const interaction = readFileSync(interactionPath, 'utf8');
  assert.match(interaction, /use the `sessionId` and `turnToken` returned by a successful `begin_turn`/i);
  assert.match(interaction, /`Tool completed successfully\.`[^\n]*normal success summary/i);
  assert.match(interaction, /do not treat[^\n]*as a missing tool response/i);
  assert.match(interaction, /continue[^\n]*`welcome_user`/i);
});

test('a begin_turn failure never fabricates a welcome component', () => {
  const interaction = readFileSync(interactionPath, 'utf8');
  assert.match(interaction, /If `begin_turn` fails/i);
  assert.match(interaction, /do not call `welcome_user`/i);
  assert.match(interaction, /do not fabricate a welcome component/i);
});

test('first-request welcome bootstrap does not broaden a scoped status answer', () => {
  const status = readFileSync(statusPath, 'utf8');
  assert.match(status, /unfiltered first-request welcome bootstrap[^\n]*only exception/i);
  assert.match(status, /report only (?:the )?matching authorized collection/i);
  assert.match(status, /do not execute collection discovery again/i);
});
