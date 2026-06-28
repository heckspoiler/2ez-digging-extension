import type { ScanMessage, ScanResult } from '../lib/messages';

// SoundCloud renders each playable item (track / mix / set) inside one of these
// cards. The Chop button lives in the card's action bar (.sc-button-group), so
// we walk up to the card and read its title link — that's the URL we submit.
// This lets the user chop a mix straight from the feed, not just its own page.
const SOUND_CARD_SELECTORS = [
  '.sound',
  '.soundList__item',
  '.soundBadge',
  '.audibleTile',
  '.trackItem',
  '.systemPlaylistBadge',
].join(',');

const TITLE_LINK_SELECTORS = [
  'a.soundTitle__title',
  'a.trackItem__trackTitle',
  '.soundTitle__titleContainer a[href]',
  'a[href*="/sets/"]',
];

function resolveHref(href: string): string {
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
}

/**
 * Find the link of the mix/set this button's card represents by walking up the
 * DOM tree. Falls back to the current page URL when the button isn't inside a
 * feed card (i.e. it's on the mix's own page).
 */
function findSetUrl(button: HTMLElement): string | null {
  const card = button.closest<HTMLElement>(SOUND_CARD_SELECTORS);
  if (card) {
    for (const selector of TITLE_LINK_SELECTORS) {
      const link = card.querySelector<HTMLAnchorElement>(selector);
      const href = link?.getAttribute('href');
      if (href) return resolveHref(href);
    }
    // Inside a card but no link found — don't guess with the page URL.
    return null;
  }
  // Not inside a feed card: assume we're on the mix's own page.
  return window.location.href;
}

function setStatus(button: HTMLButtonElement, text: string): void {
  const parent = button.parentElement;
  if (!parent) return;
  let status = parent.querySelector<HTMLElement>('.chop-status');
  if (!status) {
    status = document.createElement('span');
    status.className = 'chop-status';
    parent.appendChild(status);
  }
  status.textContent = text;
}

async function onChopClick(button: HTMLButtonElement): Promise<void> {
  if (button.dataset.busy === 'true') return;

  const url = findSetUrl(button);
  if (!url) {
    setStatus(button, 'Could not find this mix’s link');
    return;
  }

  button.dataset.busy = 'true';
  setStatus(button, 'Scanning…');

  try {
    const message: ScanMessage = { type: 'SCAN', url };
    const res = (await chrome.runtime.sendMessage(message)) as ScanResult | undefined;

    if (res?.ok) {
      setStatus(
        button,
        res.phase === 'complete'
          ? 'Done ✓ — open the extension'
          : 'Scanning… open the extension to watch',
      );
    } else if (res?.reason === 'unauthenticated') {
      setStatus(button, 'Log in via the 2ez-digging extension');
    } else {
      setStatus(button, res?.message ?? 'Could not start the scan');
    }
  } catch {
    setStatus(button, 'Could not reach the extension');
  } finally {
    button.dataset.busy = 'false';
  }
}

function injectButtons(): void {
  const buttonbars = document.querySelectorAll('.sc-button-group');
  buttonbars.forEach((bar) => {
    if (bar.querySelector('.chop-btn')) return;

    const chopButton = document.createElement('button');
    const logo = document.createElement('img');
    chopButton.className =
      'chop-btn sc-button-secondary sc-button sc-button-medium sc-button-icon sc-button-responsive';
    chopButton.type = 'button';
    chopButton.style.height = '32px';
    chopButton.title = 'Chop this mix with 2ez-digging';
    logo.alt = 'Chop Logo';
    logo.src = chrome.runtime.getURL('32-light.png');
    logo.className = 'logo-icon';
    chopButton.appendChild(logo);
    chopButton.addEventListener('click', () => void onChopClick(chopButton));
    bar.appendChild(chopButton);
  });
}

// Watch for DOM changes forever — catches SPA navigation + lazy-loaded content
const observer = new MutationObserver(() => {
  injectButtons();
});

observer.observe(document.body, { childList: true, subtree: true });
