# Aegis Agentics Claude plugin

Aegis Agentics answers general organizational-knowledge questions from the Control Tower collections a user is authorized to access. Answers are strictly grounded in returned evidence, use claim-level citations when a viewer destination is available, and remain read-only.

This public repository contains a local Claude plugin package. It is not published to an external plugin marketplace.

## Skills

The plugin exposes exactly two user-invocable skills:

- `/aegis-agentics:aegis-knowledge-search` — answer document, fact, relationship, policy, meeting, chronology, quotation, and synthesis questions from one selected authorized collection.
- `/aegis-agentics:aegis-status` — list the authorized knowledge collections and directly reported content counts available to the user.

`interaction-reference` is hidden and not a command; it enforces turn, authorization, collection, citation, and safety rules. On the first eligible request, it calls the connector's dedicated read-only `welcome_user` operation once. The connected service presents its MCP App welcome component automatically and returns the authorized collection list for reuse. The plugin does not create an Artifact or package a welcome renderer.

## Boundaries

The package performs no external web research and never fills evidence gaps with general model knowledge. It does not broaden a request into an unrestricted cross-collection search. It contains no MCP server, endpoint settings, credentials, hooks, external research, or write operations.

Authorization comes from the user's existing Control Tower connector session. Installation does not authenticate a user, grant collection access, or configure a connector.

## Prerequisites

- Node.js 22 or newer for local verification.
- Claude Desktop or Claude Code with local plugin support.
- The Control Tower connector already added and authenticated through Claude's graphical connector settings.
- At least one collection authorized to the current user for knowledge answers.

Do not place credentials, connector addresses, or account-specific configuration in this folder.

## Validate and install locally

From this repository:

```bash
npm test
npm run verify
claude plugin validate .
claude plugin validate ./plugins/aegis-agentics
claude plugin marketplace add .
claude plugin install aegis-agentics@aegis-agentics --scope user
```

For a temporary clean-room session without marketplace installation:

```bash
claude --plugin-dir ./plugins/aegis-agentics
```

After installation, run `/aegis-agentics:aegis-status` to verify that the plugin can see the collections already authorized through the connector. Do not diagnose an empty authorized result as an installation failure.

## Update locally

After replacing this local folder with a newer reviewed copy, validate it and update the installed entry:

```bash
npm test
npm run verify
claude plugin update aegis-agentics@aegis-agentics
```

## Uninstall locally

```bash
claude plugin uninstall aegis-agentics@aegis-agentics --scope user
claude plugin marketplace remove aegis-agentics
```

Uninstallation removes the local plugin entry. Connector access is managed separately in Claude's graphical settings.

## Limitations and support

- Each knowledge answer uses one selected authorized collection.
- Missing, stale, conflicting, or ambiguous evidence is reported rather than invented.
- The plugin does not ingest sources, change source systems, manage authorization, or repair connector availability.
- Share only sanitized error descriptions when requesting support. Never include tokens, IDs, raw tool output, source content, or connector configuration.
