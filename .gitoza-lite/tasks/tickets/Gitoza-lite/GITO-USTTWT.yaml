---
title: Case search priority key has no value dropdown
type: bug
status: done
priority: medium
release: Gitoza-lite/0-3-1
---

## Summary

In Test Repository search, choosing the priority frontmatter key does not show High / Medium / Low value suggestions the way Tickets search does.

## Details

- **Repro:** open Test Repository search, type `pri`, select Priority, then look for value suggestions after `priority: `.
- **Expected:** value dropdown lists High, Medium, Low (same as Tickets).
- **Actual:** key suggestion works; after the colon, no value dropdown appears.
- **Root cause:** `CASE_SEARCH_KEYS.priority` has `filterKey: "priorities"` but no static `options`, and `getCaseFilters` never returns `priorities`. Tickets work because `TICKET_SEARCH_KEYS.priority` embeds static options.
