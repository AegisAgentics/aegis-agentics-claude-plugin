# Changelog

## 0.2.5 — 2026-09-23

- Read `execute_tool` capability data directly from the parsed JSON result while preserving the structured `welcome_user` MCP App response.

## 0.2.4 — 2026-09-23

- Read `begin_turn` and `execute_tool` envelopes from their JSON text content while preserving the structured `welcome_user` MCP App response.
- Retained one bounded retry for malformed or incomplete successful `begin_turn` content without waiting or rediscovering tools.

## 0.2.3 — 2026-09-23

- Separated consecutive citation links with commas so their numeric labels cannot merge in Claude Desktop.
- Preserved exact viewer destinations and omission of references without usable destinations.

## 0.2.2 — 2026-09-23

- Added one bounded `begin_turn` retry when a successful result genuinely lacks a usable session or turn value.
- Prevented the normal Claude Desktop success summary from triggering retries, waits, or tool rediscovery.

## 0.2.1 — 2026-09-22

- Fixed successful `begin_turn` calls being mistaken for missing responses when Claude Desktop renders only the generic success summary.

## 0.2.0 — 2026-09-22

- Renamed the visible commands to `aegis-knowledge-search` and `aegis-status`.
- Replaced the packaged Artifact renderer with the connector-owned `welcome_user` MCP App.
- Added strict structured `begin_turn` handling and exact reuse of authorized collection IDs.
- Omit citations when evidence has no usable viewer destination.

## 0.1.0 — 2026-09-22

- Added the visible `knowledge-search` and `status` skills.
- Added hidden shared interaction and one-time welcome support.
- Added single-collection grounding, evidence citations, safe failure behavior, and read-only boundaries.
- Added a static validated welcome renderer and repository verification suite.
