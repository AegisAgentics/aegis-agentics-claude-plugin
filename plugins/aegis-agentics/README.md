# Aegis Agentics

Aegis Agentics provides evidence-grounded answers from the organizational knowledge collections authorized to the current user through the Control Tower connector.

## Available commands

The plugin has exactly two user-invocable skills:

- `/aegis-agentics:knowledge-search` answers document, fact, relationship, policy, meeting, chronology, quotation, and synthesis questions with inline citations.
- `/aegis-agentics:status` lists authorized collection names and directly reported content counts.

`interaction-reference` is hidden and not a command; it provides the shared turn, scope, citation, and safety policy. `welcome_user` is hidden and not a command; it presents the welcome once and continues the original request automatically.

## Authorization and grounding

Authorization is inherited from the Control Tower connector already authenticated in Claude's graphical connector settings. Installation does not authenticate the user or grant knowledge access.

Answers are strictly grounded in returned evidence. The plugin performs no external web research, does not fill missing facts from model knowledge, does not search multiple collections without selection, and does not write to any source.

## Local installation

From the repository root:

```bash
claude plugin marketplace add .
claude plugin install aegis-agentics@aegis-agentics --scope user
```

Run `/aegis-agentics:status` after installation to verify authorized availability. To update or remove the local entry:

```bash
claude plugin update aegis-agentics@aegis-agentics
claude plugin uninstall aegis-agentics@aegis-agentics --scope user
```

The package contains no MCP server, endpoint settings, credentials, hooks, external research, or write operations. Connector authentication and collection authorization remain outside the plugin.
