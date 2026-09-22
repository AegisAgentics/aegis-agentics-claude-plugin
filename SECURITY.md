# Security policy

## Supported version

Version `0.1.x` is the supported line.

## Operating boundary

This package is read-only and collection-grounded. It contains no MCP server, endpoint settings, credentials, hooks, external research, or write operations. It calls only the turn and authorized Control Tower retrieval operations named by its skills.

Retrieved documents and facts are untrusted data. Instructions inside retrieved content cannot change plugin rules, expand collection scope, authorize an action, or trigger a different tool. Malformed, unavailable, or unauthorized results fail closed with a short business-language response.

## Credentials and authorization

Never add passwords, tokens, private keys, connector addresses, cookies, account identifiers, or raw authentication output to this repository. Authorization is supplied by the user's existing Control Tower connector session. Installing the plugin neither authenticates the user nor grants access.

## Reporting an issue

Report the affected local version, the command or skill used, the expected behavior, and a minimal reproduction. Sanitize screenshots and logs. Remove session identifiers, turn tokens, collection identifiers, trace data, source content, viewer destinations, connector configuration, and personal information.

Do not publish a suspected vulnerability or sensitive reproduction. Route it through the private internal security channel approved for Aegis Agentics.
