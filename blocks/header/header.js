import { getMetadata } from '../../scripts/aem.js';
import { getRegionalDocumentPath, getSiteRegion } from '../../scripts/regional-content.js';

const DATACOM_ORIGIN = 'https://datacom.com';
const DEFAULT_ALT = 'Datacom';

async function loadHeaderContent(block) {
  if (block.textContent.trim() || block.querySelector('img, a[href]')) return block;
  const path = getRegionalDocumentPath('nav');
  if (!path.startsWith('/') || path.startsWith('//')) return block;

  try {
    const documentPath = `${path.replace(/(\.plain)?\.html$/, '')}.plain.html`;
    const response = await fetch(documentPath);
    if (!response.ok) return block;
    const content = document.createElement('main');
    content.innerHTML = await response.text();
    const sourceUrl = new URL(response.url || documentPath, window.location.href);
    content.querySelectorAll('img[src]').forEach((image) => {
      image.src = new URL(image.getAttribute('src'), sourceUrl).href;
    });
    return content.querySelector('.header') || block;
  } catch {
    return block;
  }
}

function readHeaderConfig(block) {
  const config = {};
  const fields = ['logo', 'logoAlt', 'region'];
  const fieldAliases = {
    logo: 'logo',
    logoalt: 'logoAlt',
    logoalttext: 'logoAlt',
    region: 'region',
  };
  [...block.children].forEach((row, index) => {
    const cells = [...row.children];
    const fieldName = cells.length > 1
      ? cells[0].textContent.trim().replace(/[^a-z\d]/gi, '').toLowerCase()
      : '';
    const key = cells.length > 1 ? fieldAliases[fieldName] : fields[index];
    const cell = cells.length > 1 ? cells[1] : cells[0];
    if (!key || !cell) return;
    const image = cell.querySelector('img');
    const link = cell.querySelector('a[href]');
    config[key] = key === 'logo'
      ? image?.getAttribute('src') || link?.getAttribute('href') || cell.textContent.trim()
      : cell.textContent.trim();
  });
  return config;
}

/** Read meta by either kebab-case or camelCase (UE page fields). */
function getMeta(...names) {
  for (let i = 0; i < names.length; i += 1) {
    const value = (getMetadata(names[i]) || '').trim();
    if (value) return value;
  }
  return '';
}

/**
 * Homepage URL for region, e.g. https://datacom.com/nz/en
 * @param {string} region
 * @returns {string}
 */
function getHomeUrl(region) {
  const origin = (getMetadata('datacom-origin') || DATACOM_ORIGIN).replace(/\/$/, '');
  return `${origin}/${region}/en`;
}

/**
 * Search URL for region, e.g. https://datacom.com/nz/en/search
 * @param {string} region
 * @returns {string}
 */
function getSearchUrl(region) {
  return `${getHomeUrl(region)}/search`;
}

/**
 * Logo alt text from meta or default (mirrors AEM header-mega altText).
 * @returns {string}
 */
function getLogoAlt() {
  return getMeta('logoAlt', 'logo-alt', 'logoalt') || DEFAULT_ALT;
}

/**
 * Optional authored logo image URL from page meta (UE field: logo).
 * @returns {string}
 */
function getLogoSrc() {
  return getMeta('logo');
}

function createLogoLink(region, config) {
  const homeUrl = getHomeUrl(region);
  const alt = config.logoAlt || getLogoAlt();
  const logoSrc = config.logo || getLogoSrc();

  const link = document.createElement('a');
  link.className = 'nav-brand';
  link.href = homeUrl;
  link.setAttribute('aria-label', alt);

  if (logoSrc) {
    const img = document.createElement('img');
    img.className = 'nav-brand-logo';
    img.src = logoSrc;
    img.alt = alt;
    img.loading = 'eager';
    img.width = 140;
    img.height = 24;
    link.append(img);
  } else {
    // Wordmark fallback matching datacom.com header when no logo asset is set
    const wordmark = document.createElement('span');
    wordmark.className = 'nav-brand-wordmark';
    wordmark.textContent = 'DATACOM';
    wordmark.setAttribute('aria-hidden', 'true');
    link.append(wordmark);
  }

  return link;
}

function createSearchControl(region) {
  const searchUrl = getSearchUrl(region);

  const tools = document.createElement('div');
  tools.className = 'nav-tools';

  const searchLink = document.createElement('a');
  searchLink.className = 'nav-search';
  searchLink.href = searchUrl;
  searchLink.setAttribute('aria-label', 'Search');
  searchLink.title = 'Search';
  const searchIcon = document.createElement('img');
  searchIcon.className = 'nav-search-icon';
  searchIcon.src = `${window.hlx?.codeBasePath || ''}/icons/header-search.svg`;
  searchIcon.alt = '';
  searchIcon.width = 24;
  searchIcon.height = 24;
  searchIcon.setAttribute('aria-hidden', 'true');
  searchLink.append(searchIcon);

  tools.append(searchLink);
  return tools;
}

/**
 * Datacom header: logo (alt + region homepage) + search icon → region search URL.
 * Region from meta `region` (au|nz), path, or default nz.
 * Optional meta: logo, logo-alt, datacom-origin.
 * @param {Element} block
 */
export default async function decorate(block) {
  const content = await loadHeaderContent(block);
  const config = readHeaderConfig(content);
  const region = getSiteRegion(config.region) || 'nz';

  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'header-simple';
  nav.setAttribute('aria-label', 'Main');
  nav.dataset.region = region;

  nav.append(createLogoLink(region, config), createSearchControl(region));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
