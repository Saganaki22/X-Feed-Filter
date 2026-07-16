# Chrome Web Store Listing

## Title

X Feed Filter — hide posts by keyword, handle, or hashtag

## Short summary (132 chars max)

Hide posts on X (Twitter) that match your own words, phrases, @handles, or #hashtags. 100% local and private. No tracking.

## Detailed description

X Feed Filter lets you clean up your X (Twitter) timeline by hiding posts that
match rules you define — words, phrases, account handles, or hashtags. It works
on the home timeline, Following and For You feeds, search results, profiles,
lists, and conversation threads.

**Private by design.**

- Everything runs locally in your browser. No accounts, no servers.
- No analytics, telemetry, ads, or tracking of any kind.
- The extension makes no network requests and never sends your data anywhere.
- Only one permission is requested: `storage` (to save your filters).

**Powerful matching, simple UI.**

- Three filter types: **Phrase**, **@Handle**, and **#Hashtag**.
- **Contains** or **Whole word** modes with Unicode‑aware boundaries.
- Case‑insensitive by default; optionally case‑sensitive per rule.
- Smart normalisation that defeats common evasion (full‑width letters,
  zero‑width characters, etc.).
- Matches post text, quoted posts, display names, handles, and repost labels.
- Choose to hide posts completely or show a compact placeholder with a one‑click
  “Show” button.
- Enable/disable, edit, search, import, and export your filters.

**Fast and robust.**

- A batched observer handles X’s infinite scroll without slowing the page.
- Detects client‑side navigation so new views are filtered automatically.
- Always reversible — turn filtering off and hidden posts come back.

Open source. No third‑party runtime code. Not affiliated with X/Twitter.

## Category

Productivity

## Permissions justification

- `storage` — required to save the user’s filter rules and preferences locally.
- Hosts `x.com` / `twitter.com` — the content script reads the page DOM to
  apply the user’s filters. It does not access or modify network requests,
  cookies, or X’s APIs.

## Single purpose

To locally filter and hide posts on X (Twitter) according to rules the user
explicitly creates.

## Data usage

This extension does not collect or transmit any personally identifiable
information or user data. See `docs/PRIVACY.md`.
