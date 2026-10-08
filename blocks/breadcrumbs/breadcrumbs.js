/**
 * Breadcrumbs that always appear before the current page.
 * Update this list to maintain ancestor labels, URLs, or ordering.
 */
const ANCESTOR_ITEMS = [
  { label: 'Home', path: 'https://datacom.com' },
  { label: 'Who we are', path: 'https://datacom.com/nz/en/about-us/who-we-are' },
  { label: 'Partners', path: 'https://datacom.com/nz/en/about-us/partners' },
];

function normalizeKey(value) {
  return value.trim().replace(/:$/, '').trim().toLowerCase()
    .replace(/\s+/g, ' ');
}

function getAuthoredSegments(block) {
  return [...block.children].slice(0, 4).reduce((segments, row) => {
    const cells = [...row.children];
    if (cells.length < 2) return segments;

    const key = normalizeKey(cells[0].textContent);
    const valueCell = cells[1];
    const link = valueCell.querySelector('a[href]');
    const label = (link || valueCell).textContent.trim();
    if (!label) return segments;

    segments.push({
      label,
      path: link?.href,
      isCurrent: key === 'current page',
    });
    return segments;
  }, []);
}

/**
 * Converts a URL segment into a readable breadcrumb label.
 * @param {string} segment URL path segment
 * @returns {string} readable label
 */
function getLabel(segment) {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep malformed URL segments unchanged.
  }

  return decoded
    .replace(/\.html$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Builds an accessible breadcrumb trail from the current URL.
 * @param {Element} block The breadcrumbs block
 */
export default function decorate(block) {
  const segments = window.location.pathname
    .replace(/\/index(?:\.html)?$/i, '/')
    .split('/')
    .filter(Boolean);
  const currentSegment = segments.at(-1);
  const authoredSegments = getAuthoredSegments(block);
  const currentOverride = authoredSegments.find((item) => item.isCurrent);
  const ancestors = authoredSegments.length
    ? authoredSegments.filter((item) => !item.isCurrent)
    : ANCESTOR_ITEMS;
  const items = [
    ...ancestors,
    ...(currentSegment ? [{
      label: currentOverride?.label || getLabel(currentSegment),
      path: currentOverride?.path || window.location.pathname,
      isCurrent: true,
    }] : []),
  ];

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const list = document.createElement('ol');

  items.forEach(({ label, path: itemPath, isCurrent }, index) => {
    const item = document.createElement('li');
    const isCurrentPage = isCurrent || index === items.length - 1;
    const content = document.createElement(itemPath ? 'a' : 'span');

    content.textContent = label;
    if (isCurrentPage) {
      content.setAttribute('aria-current', 'page');
    }
    if (itemPath) {
      content.href = itemPath;
    }

    item.append(content);

    if (!isCurrentPage) {
      const chevron = document.createElement('span');
      chevron.className = 'breadcrumbs-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      item.append(chevron);
    }
    list.append(item);
  });

  nav.append(list);
  block.replaceChildren(nav);
}
