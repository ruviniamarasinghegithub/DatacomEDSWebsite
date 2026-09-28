function parseInitialCount(block) {
  const rows = [...block.children];
  const countRow = rows.find((row) => row.textContent.trim().toLowerCase().startsWith('clap count:'));
  if (!countRow) return 0;

  const count = Number(countRow.textContent.split(':').slice(1).join(':').trim());
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function getPageTitle() {
  return document.querySelector('main h1')?.textContent.trim() || document.title;
}

function getShareLinks(url, title) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const emailBody = encodeURIComponent(`Hey,\n\nI found this interesting article from Datacom:\n${url}`);

  return [
    { name: 'Facebook', label: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: 'LinkedIn', label: 'in', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: 'X', label: 'X', href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { name: 'WhatsApp', label: 'wa', href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}` },
    { name: 'Reddit', label: 'r', href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
    { name: 'Email', label: '@', href: `mailto:?subject=${encodedTitle}&body=${emailBody}` },
  ];
}

function createShareLink({ name, label, href }) {
  const link = document.createElement('a');
  link.className = 'social-shares-claps-bar-share-link';
  link.href = href;
  link.setAttribute('aria-label', `Share on ${name}`);
  link.title = name;

  if (!href.startsWith('mailto:')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  const icon = document.createElement('span');
  icon.className = 'social-shares-claps-bar-share-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = label;
  link.append(icon);
  return link;
}

function formatCount(count) {
  return new Intl.NumberFormat().format(count);
}

export default function decorate(block) {
  const pagePath = window.location.pathname.toLowerCase();
  const sessionKey = `social-claps:${pagePath}`;
  const storedCount = Number(sessionStorage.getItem(sessionKey));
  let count = Number.isFinite(storedCount) && storedCount > 0
    ? storedCount
    : parseInitialCount(block);

  block.textContent = '';
  block.classList.add('social-shares-claps-bar');

  const toolbar = document.createElement('div');
  toolbar.className = 'social-shares-claps-bar-toolbar';
  toolbar.setAttribute('aria-label', 'Article reactions and sharing');

  const clapButton = document.createElement('button');
  clapButton.className = 'social-shares-claps-bar-clap';
  clapButton.type = 'button';
  clapButton.setAttribute('aria-label', `Clap for this article. ${formatCount(count)} claps`);

  const clapLabel = document.createElement('span');
  clapLabel.className = 'social-shares-claps-bar-clap-label';
  clapLabel.textContent = 'Clap';

  const clapCount = document.createElement('span');
  clapCount.className = 'social-shares-claps-bar-count';
  clapCount.setAttribute('aria-live', 'polite');
  clapCount.textContent = formatCount(count);
  clapButton.append(clapLabel, clapCount);

  const pageUrl = window.location.href;
  const shareLinks = getShareLinks(pageUrl, getPageTitle());
  const primaryLinks = document.createElement('div');
  primaryLinks.className = 'social-shares-claps-bar-primary';
  primaryLinks.setAttribute('aria-label', 'Share this article');
  primaryLinks.append(...shareLinks.slice(0, 2).map(createShareLink));

  const more = document.createElement('div');
  more.className = 'social-shares-claps-bar-more';

  const moreButton = document.createElement('button');
  moreButton.className = 'social-shares-claps-bar-more-button';
  moreButton.type = 'button';
  moreButton.setAttribute('aria-label', 'More sharing options');
  moreButton.setAttribute('aria-expanded', 'false');
  moreButton.setAttribute('aria-haspopup', 'true');
  moreButton.innerHTML = '<span aria-hidden="true">+</span>';

  const menu = document.createElement('div');
  menu.className = 'social-shares-claps-bar-menu';
  menu.hidden = true;
  menu.setAttribute('aria-label', 'More sharing options');
  menu.append(...shareLinks.slice(2).map(createShareLink));
  more.append(moreButton, menu);

  moreButton.addEventListener('click', () => {
    const isExpanded = moreButton.getAttribute('aria-expanded') === 'true';
    moreButton.setAttribute('aria-expanded', String(!isExpanded));
    menu.hidden = isExpanded;
  });

  more.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      moreButton.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      moreButton.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!more.contains(event.target)) {
      moreButton.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  });

  clapButton.addEventListener('click', async () => {
    count += 1;
    clapCount.textContent = formatCount(count);
    clapButton.setAttribute('aria-label', `Clap for this article. ${formatCount(count)} claps`);
    sessionStorage.setItem(sessionKey, String(count));

    const query = new URLSearchParams({ socialType: 'claps', pagePath, shareValue: '1' });
    try {
      const response = await fetch(`/bin/social?${query}`, { headers: { Accept: 'text/plain' } });
      if (!response.ok) return;

      const serverCount = Number(await response.text());
      if (Number.isFinite(serverCount) && serverCount >= 0) {
        count = serverCount;
        clapCount.textContent = formatCount(count);
        clapButton.setAttribute('aria-label', `Clap for this article. ${formatCount(count)} claps`);
        sessionStorage.setItem(sessionKey, String(count));
      }
    } catch (error) {
      // The local session count remains usable without the legacy count service.
    }
  });

  toolbar.append(clapButton, primaryLinks, more);
  block.append(toolbar);
}
