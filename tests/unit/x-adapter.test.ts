import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { xAdapter } from '../../src/content/adapters/x-adapter.js';

const here = path.dirname(fileURLToPath(import.meta.url));
function load(name: string): void {
  document.body.innerHTML = readFileSync(path.join(here, '..', 'fixtures', name), 'utf8');
}

describe('xAdapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds no candidates in an unrelated article', () => {
    load('unrelated-article.html');
    expect(xAdapter.findCandidates(document)).toHaveLength(0);
  });

  it('extracts text, display name, and handle from a basic post', () => {
    load('basic-post.html');
    const candidates = xAdapter.findCandidates(document);
    expect(candidates).toHaveLength(1);
    const post = xAdapter.extract(candidates[0]!);
    expect(post).not.toBeNull();
    expect(post!.fields.text).toBe('Watching Streamer University live today 🎉');
    expect(post!.fields.displayName).toBe('Kai Cenat');
    expect(post!.fields.handle).toBe('KaiCenat');
  });

  it('uses cellInnerDiv as the hide target', () => {
    load('basic-post.html');
    const post = xAdapter.extract(xAdapter.findCandidates(document)[0]!);
    expect(post!.hideTarget.getAttribute('data-testid')).toBe('cellInnerDiv');
  });

  it('includes the scope itself when a newly added tweet is scanned', () => {
    load('basic-post.html');
    const candidate = document.querySelector<HTMLElement>('[data-testid="tweet"]')!;
    expect(xAdapter.findCandidates(candidate)).toEqual([candidate]);
  });

  it('extracts quoted-post text and author', () => {
    load('quoted-post.html');
    const post = xAdapter.extract(xAdapter.findCandidates(document)[0]!);
    expect(post!.fields.text).toBe('you have to see this');
    expect(post!.fields.quotedText).toBe('Streamer University is officially back');
    expect(post!.fields.quotedDisplayName).toBe('Kai Cenat');
    expect(post!.fields.quotedHandle).toBe('KaiCenat');
  });

  it('captures repost attribution from the cell', () => {
    load('repost.html');
    const post = xAdapter.extract(xAdapter.findCandidates(document)[0]!);
    expect(post!.fields.repostAttribution).toBe('Jane Smith reposted');
  });

  it('processes promoted posts like normal posts', () => {
    load('promoted-post.html');
    const candidates = xAdapter.findCandidates(document);
    expect(candidates).toHaveLength(1);
    const post = xAdapter.extract(candidates[0]!);
    expect(post!.fields.text).toBe('Buy our thing today, 50% off');
    expect(post!.fields.handle).toBe('acme');
  });

  it('skips a tweet nested inside another tweet', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv"><article><div data-testid="tweet">
        <div data-testid="User-Name"><a href="/a">A</a><span>@a</span></div>
        <div data-testid="tweetText">outer</div>
        <div data-testid="tweet">
          <div data-testid="User-Name"><a href="/b">B</a><span>@b</span></div>
          <div data-testid="tweetText">inner</div>
        </div>
      </div></article></div>`;
    const candidates = xAdapter.findCandidates(document);
    expect(candidates).toHaveLength(2);
    expect(xAdapter.extract(candidates[0]!)).not.toBeNull();
    expect(xAdapter.extract(candidates[1]!)).toBeNull();
  });

  it('ignores nodes whose own placeholder insertion we caused', () => {
    // A placeholder node must never look like a candidate.
    document.body.innerHTML = `
      <div class="xff-placeholder" data-xff-hidden="x"><button class="xff-placeholder__show">Show</button></div>
      <div data-testid="cellInnerDiv"><article><div data-testid="tweet">
        <div data-testid="tweetText">real post</div>
      </div></article></div>`;
    expect(xAdapter.findCandidates(document)).toHaveLength(1);
  });
});
