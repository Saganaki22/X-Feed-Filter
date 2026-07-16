<p align="center">
  <img width="64" height="64" alt="X Feed Filter icon" src="https://github.com/user-attachments/assets/7af8566f-7422-4fd8-8e09-01e92d8c3d33" />
</p>

<h1 align="center">X Feed Filter</h1>

<p align="center">
  A small, privacy-first browser extension that hides posts on <strong>X (Twitter)</strong><br>
  when they match words, phrases, hashtags, or account handles you choose.
</p>

<h2 align="center">Features</h2>

- Hide matching posts completely or replace each one with a placeholder in its original position in the feed.
- Reveal an individual hidden post without disabling your filters.
- Match phrases, `@handles`, and `#hashtags`, with whole-word and case-sensitive options.
- See which filters are active or paused in the popup.
- Search, edit, pause, delete, import, and export filters.
- Rescan the current feed and view the number hidden in the current tab.
- Use a green toolbar icon while filtering is enabled and a blue one while it is disabled.
- Store everything locally. There is no telemetry, tracking, advertising, remote code, or third-party runtime service.

## Browser support

| Browser       | Support                  | Build folder    |
| ------------- | ------------------------ | --------------- |
| Google Chrome | Supported                | `dist/`         |
| Brave         | Supported (Chromium)     | `dist/`         |
| Firefox       | Supported (Firefox 142+) | `dist-firefox/` |

Chrome and Brave share the Chromium package. Firefox uses the same source and
JavaScript bundles but needs a Firefox-specific manifest, so the build command
creates a separate `dist-firefox/` package. A Firefox release must be signed by
Mozilla before it can be installed permanently by end users.

## Install

### Build from source

You need [Node.js 20 or newer](https://nodejs.org/).

```sh
git clone https://github.com/Saganaki22/X-Feed-Filter
cd X-Hide
npm install
npm run build
```

The command creates `dist/` for Chrome/Brave and `dist-firefox/` for Firefox.

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project’s `dist` folder.
5. Pin **X Feed Filter** from the Extensions menu if you want it always visible.

### Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project’s `dist` folder.

### Firefox (development/testing)

1. Open `about:debugging`.
2. Select **This Firefox**.
3. Click **Load Temporary Add-on**.
4. Select `dist-firefox/manifest.json`.

Temporary Firefox add-ons are removed when Firefox restarts. For permanent
distribution, package the build and submit it to
[Firefox Add-ons](https://addons.mozilla.org/developers/) for signing.

## Usage

1. Open X and click the blue filter icon in the browser toolbar.
2. Keep **Filtering** enabled with the switch in the popup header.
3. Choose **Hide it completely** or **Show a placeholder**.
4. Select a filter type, enter its value, and click **Add**.
5. Use the checkbox beside a saved filter to mark it **Active** or **Paused**.

Phrase filters inspect post text, quoted text, display names, and repost
attribution. Handle filters inspect the post and quoted-post authors. Hashtag
filters inspect post and quoted-post text.

The GitHub icon in the popup opens the
[X Feed Filter repository](https://github.com/Saganaki22/X-Feed-Filter).

## Privacy and permissions

The extension requests only the `storage` permission. Its content script runs
only on `x.com` and `twitter.com`. Matching and settings remain in the browser;
the extension does not collect or transmit data.

See [docs/PRIVACY.md](docs/PRIVACY.md) for the full privacy statement.

## How matching works

- Text is normalized with Unicode NFKC, zero-width characters are removed, and
  whitespace is collapsed.
- Matching is case-insensitive by default and supports Unicode text.
- Whole-word mode requires non-letter/number boundaries, so `cat` does not
  match `category`.
- Rules are compiled when settings change and reused while scanning posts.
- Extraction is fail-open: if X changes a region and it cannot be read safely,
  that region is ignored instead of hiding a post on a guess.

## Development

```sh
npm run build          # build Chromium and Firefox packages
npm run build:watch    # rebuild JavaScript while developing
npm run typecheck      # TypeScript checks
npm run lint           # ESLint checks
npm test               # unit tests
npm run format:check   # formatting check
npm run icons          # regenerate PNG icons
```

See [docs/TESTING.md](docs/TESTING.md) for manual and automated testing notes.
GitHub Actions runs the same checks and uploads both browser builds on every
pushed branch and pull request.

## Package a release

Build first, then zip the **contents** of the relevant build folder so
`manifest.json` is at the archive root.

PowerShell:

```powershell
npm run build
Compress-Archive -Path dist\* -DestinationPath x-feed-filter.zip -Force
Compress-Archive -Path dist-firefox\* -DestinationPath x-feed-filter-firefox.zip -Force
```

## Limitations

X changes its page structure frequently. The adapter uses stable
`data-testid` hooks where possible, but a major X redesign may require an
adapter update. The extension is not affiliated with X or Twitter.

## License

Released under the [MIT License](LICENSE).
