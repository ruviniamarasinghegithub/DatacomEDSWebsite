import { getMetadata } from '../../scripts/aem.js';

const DATACOM_ORIGIN = 'https://datacom.com';
const DEFAULT_ALT = 'Datacom';
const SUPPORTED_REGIONS = ['nz', 'au'];

async function loadHeaderContent(block) {
  if (block.children.length) return block;
  const path = (getMetadata('nav') || '/nav').trim();
  if (!path.startsWith('/') || path.startsWith('//')) return block;

  try {
    const response = await fetch(`${path.replace(/(\.plain)?\.html$/, '')}.plain.html`);
    if (!response.ok) return block;
    const content = document.createElement('main');
    content.innerHTML = await response.text();
    return content.querySelector('.header') || block;
  } catch {
    return block;
  }
}

function readHeaderConfig(block) {
  const config = {};
  const fields = ['logo', 'logoAlt', 'region'];
  [...block.children].forEach((row, index) => {
    const cells = [...row.children];
    const key = cells.length > 1
      ? fields.find((field) => field.toLowerCase() === cells[0].textContent.trim().replace(/[\s-]/g, '').toLowerCase())
      : fields[index];
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

/**
 * Resolve site region (nz | au) from page meta, path, or default nz.
 * Meta: <meta name="region" content="au">
 * @returns {'nz'|'au'}
 */
function getRegion(authoredRegion = '') {
  const selectedRegion = authoredRegion.trim().toLowerCase();
  if (SUPPORTED_REGIONS.includes(selectedRegion)) return selectedRegion;
  const meta = (getMetadata('region') || getMetadata('search-region') || '').trim().toLowerCase();
  if (SUPPORTED_REGIONS.includes(meta)) return meta;

  const path = window.location.pathname.replace(/^\/content\/datacom/, '');
  const match = path.match(/^\/(nz|au)(?:\/|$)/i);
  if (match) return match[1].toLowerCase();

  return 'nz';
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
  const searchIcon = document.createElement('i');
  searchIcon.className = 'fal fa-search nav-search-icon';
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
  const region = getRegion(config.region);

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
