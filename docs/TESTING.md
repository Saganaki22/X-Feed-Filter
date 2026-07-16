# Testing

Tests use [Vitest](https://vitest.dev/) with a [jsdom](https://github.com/jsdom/jsdom) environment so the DOM‑dependent adapter code can run without a browser.

## Run

```sh
npm test           # run once
npm run test:watch # watch mode
```

## What is covered

| Suite                       | Purpose                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `normalise.test.ts`         | NFKC, zero‑width stripping, whitespace collapse, casing, handle/hashtag marker stripping.                       |
| `rule-compiler.test.ts`     | Phrase contains/whole‑word, handle, hashtag, case sensitivity, disabled/empty rules.                            |
| `rule-matcher.test.ts`      | First‑match wins, field mapping, no‑match passthrough.                                                          |
| `storage-migration.test.ts` | Malformed input → defaults, partial input merge, enum coercion, dedupe.                                         |
| `popup-state.test.ts`       | Awaited, ordered settings persistence and post-save notifications.                                              |
| `message-handler.test.ts`   | Rescan/save messages reload persisted settings before an immediate scan.                                        |
| `x-adapter.test.ts`         | Extraction of text/handle/display name/quoted post/repost attribution from fixture HTML; nested/quote skipping. |

## Fixtures

`tests/fixtures/*.html` are hand‑built tweet fragments that mirror the
`data-testid` hooks the adapter relies on (`tweet`, `tweetText`, `User-Name`,
`quoteTweet`, `cellInnerDiv`). They let the adapter run under jsdom and keep
the extraction logic testable without a live X page.

## Manual smoke test

1. `npm run build`
2. Load `dist/` as an unpacked extension (see README).
3. Open x.com, add a phrase filter via the popup, confirm matching posts
   disappear (or show a placeholder) immediately without refreshing.
4. Add a matching post before saving a new filter, press **Rescan feed**, and
   confirm the latest saved filter is used.
5. Toggle the master switch off and confirm posts reappear.
6. Import/Export a JSON file.

## E2E (optional)

An end‑to‑end spec (`tests/e2e/extension.spec.ts`) using Playwright is provided
as a starting point. It requires Playwright with channel `chromium` and loading
the unpacked extension; run it in an environment that supports headless
extension loading.
