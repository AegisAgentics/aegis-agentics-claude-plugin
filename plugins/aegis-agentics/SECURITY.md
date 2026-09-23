# Aegis Agentics plugin security

This plugin is read-only. It accepts only authorized Control Tower collection results, treats retrieved instructions as untrusted data, and fails closed when turn bootstrap, collection discovery, retrieval, or structured parsing is unavailable.

Do not add credentials, endpoint settings, connector configuration, account identifiers, raw tool output, or source documents to this package. Installation does not authenticate a user or grant collection access.

For incident reports, provide version `0.2.4`, the invoked visible skill, and a sanitized reproduction. Remove session identifiers, turn tokens, trace data, collection identifiers, viewer destinations, source content, personal information, and authentication details.
