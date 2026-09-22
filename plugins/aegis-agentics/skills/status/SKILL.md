---
name: status
description: Show the authorized organizational knowledge collections currently available to the user.
---

# Aegis Agentics status

Load `interaction-reference` before working and follow its turn, authorization, safety, and response rules. Load `welcome_user` only when the shared first-request gate requires it. Never mention either hidden reference.

## Workflow

1. The only permitted operations are `begin_turn` and direct `context-hub.queryCollections`. Do not use discovery, connector listing, provider, confirmation, or write capabilities.
2. Reuse the collection list already obtained for the welcome bootstrap or an earlier eligible request. When that list is available, do not call `queryCollections` again. Otherwise call it once without a filter, using the current top-level `session_id` and `turnToken`.
3. Read structured content and apply the fallback rules in `interaction-reference`. Do not scrape prose or infer fields.
4. If the user names a collection, resolve only that human-readable scope. The first-request bootstrap is unfiltered so the welcome can show authorized availability; for the status answer, report only authorized matches for that name and never expose unrelated collection names. If several names match, ask one concise disambiguation question. If none match, state that the requested knowledge area is not available and stop.
5. Work read-only. Report only each returned human-readable collection name and its directly reported content count. Do not infer readiness, coverage, sync time, or user totals. Do not include ingestion state or other metadata.

## Response contract

Use exactly one applicable shape. Never include raw IDs, session data, turn tokens, trace data, or raw JSON.

### Returned collections

Start with `**Available knowledge**`.

List each returned collection once as a bullet. Use its bold human-readable collection name followed by `— 1 content item` or `— {count} content items` only when that count was directly reported. If no count was returned, list the name alone.

### Empty result

Return exactly:

`**Available knowledge**`

`No knowledge collections are currently available to you.`

An empty result is valid, not an error. Add nothing else.

### Unavailable result

Return exactly:

`**Available knowledge**`

`Your knowledge collections could not be loaded right now.`

Do not misreport unavailability as an empty account. Do not narrate the failure or add troubleshooting.
