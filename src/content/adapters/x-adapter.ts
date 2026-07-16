import type { ExtractedPost, FieldKey, PostFields } from '../../shared/types.js';
import type { PlatformAdapter } from './platform-adapter.js';

/**
 * X (twitter) DOM adapter.
 *
 * X renders generated class names that change between builds, so this adapter
 * deliberately relies on the relatively stable `data-testid` attributes and a
 * few semantic element types (`article`, `a[href]`). Everything site-specific
 * lives here so a DOM change only requires editing this file.
 *
 * The adapter is *fail-open*: if a region can't be confidently extracted it is
 * simply omitted rather than guessed, so the engine never hides based on bad
 * data.
 */

const SEL = {
  tweetRoot: '[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  userName: '[data-testid="User-Name"]',
  cellInner: '[data-testid="cellInnerDiv"]',
  article: 'article',
  quoteTweet: '[data-testid="quoteTweet"]',
  // X wraps promoted posts in placement-tracking containers; we still match them.
  placement: '[data-testid="placementTracking"]',
} as const;

function collectText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  if (tag === 'img') {
    const alt = el.getAttribute('alt');
    return alt ? `${alt} ` : '';
  }
  // Skip interactive controls that aren't part of the readable text.
  if (tag === 'button' || el.getAttribute('role') === 'button') return '';
  let out = '';
  for (const child of Array.from(el.childNodes)) out += collectText(child);
  return out;
}

/** Readable, whitespace-collapsed text including image alt text (emoji). */
function textOf(el: Element | null | undefined): string {
  if (!el) return '';
  return collectText(el).replace(/\s+/g, ' ').trim();
}

function resolveHideTarget(root: HTMLElement): HTMLElement {
  return root.closest<HTMLElement>(SEL.cellInner) ?? root.closest<HTMLElement>(SEL.article) ?? root;
}

interface AuthorBits {
  displayName: string;
  handle: string;
}

function extractAuthor(scope: HTMLElement): AuthorBits {
  const region = scope.querySelector<HTMLElement>(SEL.userName) ?? scope;
  // Display name = first in-scope profile link's text.
  const link = region.querySelector<HTMLAnchorElement>('a[href^="/"]');
  const displayName = link ? textOf(link) : '';
  // Handle = the "@screenname" token anywhere in the header text.
  const m = textOf(region).match(/@([A-Za-z0-9_]+)/);
  return { displayName, handle: m ? (m[1] ?? '') : '' };
}

function extractRepostAttribution(scope: HTMLElement): string {
  // Best-effort: X puts "Name reposted" in a short element near the post top.
  const nodes = scope.querySelectorAll<HTMLElement>(
    '[data-testid*="ocial"], [data-testid*="ontext"], span, a',
  );
  for (const el of nodes) {
    const t = textOf(el);
    if (t.length > 0 && t.length < 60 && /\brepost(ed)?\b/i.test(t) && !/replying/i.test(t)) {
      return t;
    }
  }
  return '';
}

function extract(candidate: HTMLElement): ExtractedPost | null {
  if (!candidate || !candidate.isConnected) return null;

  // Never process a post nested inside another post or inside a quote — its
  // parent handles it. This prevents double counting.
  const nestedInTweet = candidate.parentElement?.closest(SEL.tweetRoot);
  if (nestedInTweet) return null;
  if (candidate.closest(SEL.quoteTweet)) return null;

  const hideTarget = resolveHideTarget(candidate);
  const quote = candidate.querySelector<HTMLElement>(SEL.quoteTweet);

  // Main text = first tweet-text region (document order). Quote text comes from
  // the quote container's own tweet-text region, if present.
  const allText = Array.from(candidate.querySelectorAll<HTMLElement>(SEL.tweetText));
  const mainTextEl = allText.find((el) => !el.closest(SEL.quoteTweet)) ?? allText[0] ?? null;
  const quoteTextEl = quote ? (quote.querySelector<HTMLElement>(SEL.tweetText) ?? null) : null;

  const author = extractAuthor(candidate);
  const quotedAuthor = quote ? extractAuthor(quote) : { displayName: '', handle: '' };
  const repostAttribution = extractRepostAttribution(hideTarget);

  const fields: PostFields = {};
  if (mainTextEl) fields.text = textOf(mainTextEl);
  if (quoteTextEl) fields.quotedText = textOf(quoteTextEl);
  if (author.displayName) fields.displayName = author.displayName;
  if (author.handle) fields.handle = author.handle;
  if (quotedAuthor.displayName) fields.quotedDisplayName = quotedAuthor.displayName;
  if (quotedAuthor.handle) fields.quotedHandle = quotedAuthor.handle;
  if (repostAttribution) fields.repostAttribution = repostAttribution;

  // A post with no extractable fields at all is not actionable — skip it.
  const hasAny = (Object.keys(fields) as FieldKey[]).some((k) => {
    const v = fields[k];
    return typeof v === 'string' && v.length > 0;
  });
  if (!hasAny) return null;

  return { root: candidate, hideTarget, fields };
}

export const xAdapter: PlatformAdapter = {
  name: 'x',
  candidateSelector: SEL.tweetRoot,
  containerSelector: SEL.cellInner,
  findCandidates(scope: ParentNode): HTMLElement[] {
    const descendants = Array.from(scope.querySelectorAll<HTMLElement>(SEL.tweetRoot));
    if (scope instanceof HTMLElement && scope.matches(SEL.tweetRoot)) {
      descendants.unshift(scope);
    }
    return descendants;
  },
  extract,
};
