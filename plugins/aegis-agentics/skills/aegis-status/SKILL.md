---
name: aegis-status
description: Use when the user asks which authorized Aegis Agentics knowledge collections are currently available.
---

# Aegis Agentics status

Load `interaction-reference` before working and follow its turn, authorization, safety, and response rules. Never mention that hidden reference.

## Workflow

1. Follow the shared gateway turn workflow before any direct capability execution.
2. Do not recreate or narrate the connector-owned welcome component. Keep all other inspection and execution silent.
3. Reuse the collection list already obtained for the welcome bootstrap or an earlier request in this conversation; do not execute collection discovery again. Do not call `queryCollections` again when that list is available. Otherwise, call `execute_tool` directly for `context-hub.queryCollections` once without a filter, using the current top-level `session_id` and `turnToken`.
4. The only permitted gateway operations for this skill are `begin_turn` under the attempt limits in `interaction-reference`, the shared first-request `welcome_user` bootstrap when applicable, and direct `execute_tool` for `context-hub.queryCollections` only when no reusable authorized collection list exists. Never discover or substitute another capability.
5. If the user names a collection, resolve only that human-readable scope. With one match, report only the matching authorized collection. With several matches, ask one concise question using only their names. With no match, state that the requested knowledge area is unavailable and stop. The unfiltered first-request welcome bootstrap is the only exception to the prohibition on an unfiltered named-scope status request; never expose unrelated collection names in the status answer. Outside that bootstrap, if the available status capability cannot enforce the requested restriction, do not execute an unfiltered request.
6. Read the governed structured result according to `interaction-reference`. Report only each returned human-readable collection name and its directly reported content count. Do not infer readiness, coverage, sync time, or user totals. Do not infer processing state, freshness, source totals, or workspace totals.
7. Keep service access separate from knowledge availability. A reachable service can validly return no authorized collections.

## Response contract

Use exactly one applicable shape. Never include raw IDs, session data, turn tokens, trace data, or raw JSON. Do not expose internal mechanics.

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
