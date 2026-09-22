# Changelog

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
