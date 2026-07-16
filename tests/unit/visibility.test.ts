import { beforeEach, describe, expect, it } from 'vitest';
import { VisibilityController } from '../../src/content/visibility.js';

describe('VisibilityController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('swaps the tweet root for a placeholder inside the virtualized cell', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <article><div data-testid="tweet">Original post</div></article>
      </div>`;
    const cell = document.querySelector<HTMLElement>('[data-testid="cellInnerDiv"]')!;
    const tweet = document.querySelector<HTMLElement>('[data-testid="tweet"]')!;
    const article = document.querySelector('article')!;
    const visibility = new VisibilityController('placeholder');

    expect(visibility.apply(cell, 'spoiler', tweet)).toBe(true);
    expect(article.querySelector('[data-testid="tweet"]')).toBeNull();
    expect(article.querySelector('.xff-placeholder')).not.toBeNull();
    expect(tweet.isConnected).toBe(false);
  });

  it('toggles a placeholder between Show and Hide without duplicates', () => {
    document.body.innerHTML = `
      <div id="cell"><article><div data-testid="tweet">Original post</div></article></div>`;
    const cell = document.getElementById('cell')!;
    const tweet = cell.querySelector<HTMLElement>('[data-testid="tweet"]')!;
    const visibility = new VisibilityController('placeholder');
    visibility.apply(cell, 'spoiler', tweet);

    const show = cell.querySelector<HTMLButtonElement>('.xff-placeholder__show')!;
    show.click();
    expect(tweet.isConnected).toBe(true);
    expect(cell.querySelector('.xff-placeholder')).not.toBeNull();
    expect(show.textContent).toBe('Hide');
    expect(show.getAttribute('aria-pressed')).toBe('true');
    expect(cell.querySelectorAll('[data-testid="tweet"]')).toHaveLength(1);

    show.click();
    expect(tweet.isConnected).toBe(false);
    expect(show.textContent).toBe('Show');
    expect(show.getAttribute('aria-pressed')).toBe('false');

    show.click();
    expect(tweet.isConnected).toBe(true);
    expect(show.textContent).toBe('Hide');
    expect(cell.querySelectorAll('[data-testid="tweet"]')).toHaveLength(1);

    expect(visibility.restore(cell)).toBe(true);
    expect(tweet.isConnected).toBe(true);
    expect(cell.querySelector('.xff-placeholder')).toBeNull();
  });

  it('replaces a tweet that X recreates while the placeholder is visible', () => {
    document.body.innerHTML = `
      <div id="cell"><article><div data-testid="tweet">Original post</div></article></div>`;
    const cell = document.getElementById('cell')!;
    const firstTweet = cell.querySelector<HTMLElement>('[data-testid="tweet"]')!;
    const visibility = new VisibilityController('placeholder');
    visibility.apply(cell, 'spoiler', firstTweet);

    const replacement = document.createElement('div');
    replacement.dataset.testid = 'tweet';
    replacement.textContent = 'Recreated post';
    cell.querySelector('article')!.append(replacement);
    visibility.apply(cell, 'spoiler', replacement);

    expect(replacement.isConnected).toBe(false);
    expect(cell.querySelectorAll('.xff-placeholder')).toHaveLength(1);
    visibility.restore(cell);
    expect(cell.textContent).toContain('Recreated post');
  });
});
