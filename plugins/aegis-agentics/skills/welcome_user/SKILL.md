---
name: welcome_user
description: Shared first-request welcome presentation for Aegis Agentics conversations.
user-invocable: false
---

# Aegis Agentics welcome

Use this hidden presentation skill only through the first-request gate in `interaction-reference`. Never expose it as a command.

## Input contract

Pass exactly one object to the renderer:

```json
{
  "state": "connected | empty | unavailable",
  "collections": [
    { "name": "<human-readable collection name>", "contentCount": 0 }
  ]
}
```

Use `connected` only with one or more authorized collections. Include only the returned human-readable name and optional directly reported content count. Use `empty` with an empty list for a successful zero-collection result. Use `unavailable` with an empty list when availability cannot be loaded. Never pass IDs, descriptions, source metadata, tokens, or raw results.

## Presentation contract

On the first eligible Aegis Agentics request, make one Artifact rendering attempt with the HTML produced by `scripts/render-welcome.mjs`. Present the artifact exactly once, then continue the original request automatically. Never ask the user to confirm, press a control, or choose a button.

If artifact presentation is unavailable, show one concise text fallback with the same state, collection names, optional counts, and `Continuing with your request`. That fallback counts as the welcome. Do not retry presentation and do not expose the render failure.

Never present the welcome on a later request in the same Claude conversation, even when the active Aegis Agentics skill changes. Never let a welcome failure block the active skill's applicable business response.
