import { getMetadata } from '../../scripts/aem.js';

const DEFAULT_START_LEVEL = 2;

function normalizeKey(value) {
  return value.trim().replace(/:$/, '').trim().toLowerCase()
    .replace(/\s+/g, ' ');
}

function getFields(block) {
  return [...block.children].reduce((fields, row) => {
    const cells = [...row.children];
    if (cells.length < 2) return fields;

    const key = normalizeKey(cells[0].textContent);
    const value = cells[1].textContent.trim();
    if (key) fields[key] = value;
    return fields;
  }, {});
}

function parseBoolean(value, fieldName, defaultValue) {
  if (!value) return defaultValue;
  if (/^(yes|true)$/i.test(value)) return true;
  if (/^(no|false)$/i.test(value)) return false;
  // eslint-disable-next-line no-console
  console.warn(`Breadcrumb full version: invalid value for "${fieldName}": "${value}".`);
  return defaultValue;
}

function parseStartLevel(value) {
  if (!value) return DEFAULT_START_LEVEL;
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  // eslint-disable-next-line no-console
  console.warn(`Breadcrumb full version: invalid navigation start level "${value}".`);
  return DEFAULT_START_LEVEL;
}

function getPathLabel(segment) {
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

function normalizePath(path) {
  return path.replace(/\.html$/i, '').replace(/\/+$/, '') || '/';
}

async function resolveRedirect(path) {
  const pageUrl = new URL(`${path}.plain.html`, window.location.href);
  const response = await fetch(pageUrl);
  if (!response.ok) {
    throw new Error(`Failed to resolve breadcrumb page ${path}: ${response.status}`);
  }

  const resolvedUrl = new URL(response.url);
  resolvedUrl.pathname = resolvedUrl.pathname.replace(/\.plain\.html$/i, '');
  return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}

async function getNavigationItems() {
  const navMetadata = getMetadata('nav');
  const navPath = navMetadata ? new URL(navMetadata, window.location.href).pathname : '/nav';
  const response = await fetch(`${navPath}.plain.html`);
  if (!response.ok) {
    throw new Error(`Failed to load breadcrumb navigation from ${navPath}: ${response.status}`);
  }

  const html = await response.text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const items = new Map();

  parsed.querySelectorAll('a[href]').forEach((link) => {
    const url = new URL(link.getAttribute('href'), window.location.href);
    if (url.origin !== window.location.origin) return;
    const path = normalizePath(url.pathname);
    const label = link.textContent.trim();
    if (label) items.set(path, label);
  });

  return items;
}

function createBreadcrumbItem(item, isCurrent) {
  const listItem = document.createElement('li');
  listItem.className = 'breadcrumb-full-version-item';
  const content = document.createElement(isCurrent ? 'span' : 'a');
  content.textContent = item.label;

  if (isCurrent) {
    content.setAttribute('aria-current', 'page');
  } else {
    content.href = item.path;
  }

  listItem.append(content);

  if (!isCurrent) {
    const chevron = document.createElement('span');
    chevron.className = 'breadcrumb-full-version-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    listItem.append(chevron);
  }

  return listItem;
}

/**
 * Decorates a configurable breadcrumb trail using the current URL and DA navigation.
 * @param {Element} block The breadcrumb block
 */
export default async function decorate(block) {
  const fields = getFields(block);
  const startLevel = parseStartLevel(fields['navigation start level']);
  const showHidden = parseBoolean(fields['show hidden navigation items'], 'Show hidden navigation items', false);
  const hideCurrent = parseBoolean(fields['hide current page'], 'Hide current page', false);
  const disableShadowing = parseBoolean(fields['disable shadowing'], 'Disable shadowing', false);
  const { id } = fields;
  const navigationItems = showHidden && disableShadowing ? new Map() : await getNavigationItems();

  const segments = window.location.pathname
    .replace(/\/index(?:\.html)?$/i, '/')
    .split('/')
    .filter(Boolean);
  const items = await Promise.all(segments.slice(startLevel).map(async (segment, index) => {
    const segmentIndex = index + startLevel;
    const originalPath = `/${segments.slice(0, segmentIndex + 1).join('/')}`;
    const path = disableShadowing ? originalPath : await resolveRedirect(originalPath);
    const normalizedPath = normalizePath(path);
    const navigationLabel = navigationItems.get(normalizedPath);

    return {
      path,
      label: !disableShadowing && navigationLabel
        ? navigationLabel
        : getPathLabel(path.split('/').filter(Boolean).at(-1) || segment),
      isVisible: showHidden || navigationItems.has(normalizedPath),
      isCurrent: segmentIndex === segments.length - 1,
    };
  }));
  const visibleItems = items.filter((item) => item.isVisible && !(hideCurrent && item.isCurrent));

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  if (id) nav.id = id;

  const list = document.createElement('ol');
  list.className = 'breadcrumb-full-version-list';
  visibleItems.forEach((item) => {
    list.append(createBreadcrumbItem(item, item.isCurrent));
  });

  nav.append(list);
  block.replaceChildren(nav);
}
