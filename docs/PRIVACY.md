# Privacy Policy

**X Feed Filter** is a browser extension that hides posts on x.com and
twitter.com based on rules you create. This page describes what the extension
does and does not do with data.

## What we collect

**Nothing.** The extension has no server, no backend, no analytics, no
telemetry, and no crash reporting. It makes **no network requests** of any kind.
It cannot send your data anywhere, because it never transmits anything.

## What is stored, and where

- Your filter rules and settings are stored **locally** in your browser via
  `chrome.storage.local`. They never leave your machine.
- The content script keeps small **in‑memory** counters (how many posts were
  checked/hidden in the current tab). These are reset when the page reloads or
  you navigate, and are never written to disk or storage.

## What is NOT stored

The extension does **not** store, log, or transmit:

- Post text, or any content of posts you see or that get hidden.
- Usernames, handles, display names, or profile information.
- URLs, browsing history, or search history.
- Cookies, tokens, or any authentication material.

The only persisted data is the list of rules you typed in yourself.

## Permissions

| Permission                           | Why it’s needed                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                            | To save your filter rules and settings locally.                                                                                                     |
| Host access (`x.com`, `twitter.com`) | Via a statically‑declared content script, so the extension can read the page DOM to apply your filters. It does not read or modify network traffic. |

No `tabs`, `history`, `cookies`, `webRequest`, or `scripting` permissions are
requested. The extension does not intercept or modify X’s network requests or
GraphQL APIs.

## Open source

All code is provided and auditable. There is no obfuscated or remote code; the
extension bundle is built entirely from this repository with no third‑party
runtime dependencies.

## Contact

This is an independent, unaffiliated project. For questions, open an issue in
the repository this extension was distributed from.
