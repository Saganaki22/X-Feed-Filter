# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-07-16

### Fixed

- New, edited, enabled, disabled, imported, and deleted filters now apply to the
  open X feed immediately after they are saved.
- Settings writes are awaited and serialized so rapid popup changes cannot be
  persisted out of order.
- **Rescan feed** now reloads the latest saved settings before performing an
  immediate full scan, allowing it to recover from a missed live-update event.

### Changed

- Added regression tests for ordered popup persistence and storage-refreshing
  content-script messages.
- Kept the existing `storage`-only permission model; no new permissions were
  added.

## [1.0.0] - 2026-07-16

### Added

- Initial release.
- Master enable/disable switch.
- Filter rules of three types: **phrase**, **@handle**, **#hashtag**.
- Two text modes: **contains** and **whole word** (Unicode‑aware boundaries).
- Case‑insensitive matching by default; optional per‑rule case sensitivity.
- Unicode‑aware normalisation (NFKC, zero‑width stripping, whitespace collapse).
- Matches across post text, quoted text, author/quoted display names, author/
  quoted handles, and repost attribution.
- Works on home, Following, For You, search, profiles, lists, communities,
  conversation threads, and promoted posts that use the standard component.
- Batched `MutationObserver` for infinite scroll; SPA route detection.
- Two actions: **hide completely** or **compact placeholder** with a temporary
  Show button.
- Session hidden counter and Rescan button in the popup.
- Import / Export rules as JSON, and Reset.
- Dark/light theme via `prefers-color-scheme`.
- Manifest V3, single permission (`storage`), no remote code, no runtime deps.

[1.1.0]: https://github.com/Saganaki22/X-Feed-Filter/releases/tag/v1.1.0
[1.0.0]: https://github.com/Saganaki22/X-Feed-Filter/releases/tag/v1.0.0
