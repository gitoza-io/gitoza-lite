---
title: Search custom fields as frontmatter keys, not a Custom field key
type: bug
status: done
priority: medium
release: Gitoza-lite/0-3-1
---

## Summary

In Tickets and Test Repository search, each existing custom field key should appear as its own frontmatter key with value suggestions. Do not expose a synthetic **Custom field** search key. The Test Repository implementation for this is wrong today.

## Details

- **Expected:** Known custom field keys (from case/ticket params) show up in the key dropdown like other frontmatter (e.g. typing the key name suggests `my_field: `). After a colon, values for that key appear in the value dropdown.
- **Expected:** There is no frontmatter/search key labeled **Custom field** (or similar); `param` / “Custom field” must not be treated as a searchable key.
- **Actual (Test Repository):** Custom-field search is incorrect — it uses a **Custom field** key instead of promoting real param keys into the frontmatter key list.
- Apply the same correct behavior on **Tickets** and **Test Repository** (cases).
- Value options should come from known values for that custom key (catalog / loaded entities).
