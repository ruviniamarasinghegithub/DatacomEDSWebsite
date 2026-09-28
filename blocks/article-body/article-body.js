import { decorateBlock, loadBlock } from '../../scripts/aem.js';

function getVariant(block, name) {
  return block.classList.contains(`article-body-${name}`)
    || block.classList.contains(name);
}

function getText(cell) {
  return cell?.textContent.trim() || '';
}

function normalizeLabel(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function toBoolean(value) {
  return ['true', 'yes', '1', 'on'].includes(value.toLowerCase());
}

function getSetting(rows, names, fallback = '') {
  const row = rows.find((item) => names.includes(item.label));
  return row ? getText(row.cells[1]) : fallback;
}

function getImage(cell, alt, useDamAlt) {
  const picture = cell?.querySelector('picture');
  const image = cell?.querySelector('img');
  const source = picture || image;
  if (source) {
    const result = source.cloneNode(true);
    const resultImage = result.matches('img') ? result : result.querySelector('img');
    if (resultImage && !useDamAlt) resultImage.alt = alt;
    return result;
  }

  const link = cell?.querySelector('a');
  const path = link?.href || getText(cell);
  if (!path) return null;
  const result = document.createElement('img');
  result.src = path;
  result.alt = alt;
  return result;
}

function getPartnerField(row) {
  const label = normalizeLabel(getText(row.children[0]));
  const value = row.children[1];
  const valueText = getText(value);
  const fieldNames = {
    'partner name': 'name',
    image: 'image',
    'alternative text for image': 'alt',
    'get image alternative text from dam': 'useDamAlt',
    'link url': 'url',
    'open link in a new': 'newTab',
  };
  return fieldNames[label] ? { name: fieldNames[label], value, valueText } : null;
}

function buildPartnerDisplay(partners, settings) {
  if (!toBoolean(settings.show)) return null;

  const container = document.createElement('section');
  const heading = document.createElement('h3');
  const list = document.createElement('ul');
  const autoplay = toBoolean(settings.autoplay);
  const variant = settings.variant.toLowerCase() === 'carousel' ? 'carousel' : 'static';

  container.className = `article-body-partner-display ${variant}`;
  heading.textContent = settings.heading || 'Partners';
  list.className = 'article-body-partner-display-list';
  list.setAttribute('aria-label', heading.textContent);
  container.style.setProperty('--article-body-autoplay-delay', `${Number(settings.delay) || 5}s`);

  partners.forEach((partner) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const image = getImage(
      partner.image,
      partner.alt,
      partner.useDamAlt,
    );

    link.href = partner.url || '#';
    link.target = partner.newTab ? '_blank' : '_self';
    link.rel = link.target === '_blank' ? 'noopener noreferrer' : '';
    link.setAttribute('aria-label', partner.name);
    if (image) link.append(image);
    const name = document.createElement('span');
    name.textContent = partner.name;
    link.append(name);
    item.append(link);
    list.append(item);
  });

  container.append(heading, list);
  if (variant === 'carousel' && autoplay) {
    container.addEventListener('mouseenter', () => container.classList.add('is-paused'));
    container.addEventListener('mouseleave', () => container.classList.remove('is-paused'));
    container.addEventListener('focusin', () => container.classList.add('is-paused'));
    container.addEventListener('focusout', () => container.classList.remove('is-paused'));
  }
  return container;
}

function getSectionLabel(section) {
  const heading = section.querySelector('h1, h2, h3, h4, h5, h6, strong');
  return heading?.textContent.trim().toLowerCase() || '';
}

function decorateSidebar(sidebar, block) {
  const hideIndustries = getVariant(block, 'hide-industries-tags');
  const hideSolutions = getVariant(block, 'hide-solutions-tags');

  [...sidebar.children].forEach((section) => {
    const label = getSectionLabel(section);
    if (label.includes('industry')) {
      section.classList.add('article-body-tag-ctn', 'industries-tags');
      if (hideIndustries) section.hidden = true;
    } else if (label.includes('solution')) {
      section.classList.add('article-body-tag-ctn', 'solutions-tags');
      if (hideSolutions) section.hidden = true;
    } else {
      section.classList.add('article-body-sidebar-section');
    }

    const list = section.querySelector('ul, ol');
    if (list) list.classList.add('article-body-tag-list');
  });
}

function isBlockMarkup(element) {
  const rows = [...element.children];
  return rows.length > 0 && rows.every((row) => (
    row.tagName === 'DIV'
    && row.children.length > 0
    && [...row.children].every((cell) => cell.tagName === 'DIV')
  ));
}

async function decorateNestedBlocks(container) {
  const candidates = [...container.querySelectorAll('div[class]')]
    .filter((candidate) => isBlockMarkup(candidate));
  const topLevelCandidates = candidates.filter((candidate) => (
    !candidates.some((other) => other !== candidate && other.contains(candidate))
  ));

  for (let index = 0; index < topLevelCandidates.length; index += 1) {
    const nestedBlock = topLevelCandidates[index];
    decorateBlock(nestedBlock);
    // eslint-disable-next-line no-await-in-loop
    await loadBlock(nestedBlock);
    // eslint-disable-next-line no-await-in-loop
    await decorateNestedBlocks(nestedBlock);
  }
}

export default async function decorate(block) {
  const rows = [...block.children];
  const leftColumn = document.createElement('div');
  const rightColumn = document.createElement('aside');
  const settingsRows = [];
  const contentRows = [];
  const partners = [];
  let inCarouselContent = false;
  let currentPartner = null;

  rows.forEach((row) => {
    const cells = [...row.children];
    const label = normalizeLabel(getText(cells[0]));
    if (label === 'field' && normalizeLabel(getText(cells[1])) === 'value') {
      return;
    }
    if (label === 'carousel content') {
      inCarouselContent = true;
    } else if (inCarouselContent) {
      const field = getPartnerField(row);
      if (field?.name === 'name') {
        if (currentPartner?.name) partners.push(currentPartner);
        currentPartner = {
          name: field.valueText,
          image: null,
          alt: '',
          useDamAlt: false,
          url: '',
          newTab: false,
        };
      } else if (field && currentPartner) {
        if (field.name === 'image') currentPartner.image = field.value;
        if (field.name === 'alt') currentPartner.alt = field.valueText;
        if (field.name === 'useDamAlt') currentPartner.useDamAlt = toBoolean(field.valueText);
        if (field.name === 'url') currentPartner.url = field.valueText;
        if (field.name === 'newTab') currentPartner.newTab = toBoolean(field.valueText);
      }
    } else if (!inCarouselContent && cells.length >= 2 && [
      'hide industries tags',
      'hide solutions tags',
      'show partner display',
      'heading',
      'auto play delay',
      'enable autoplay',
      'carousel variant',
    ].includes(label)) {
      settingsRows.push({ label, cells });
    } else {
      contentRows.push(row);
    }
  });

  if (currentPartner?.name) partners.push(currentPartner);

  const settings = {
    hideIndustries: toBoolean(getSetting(settingsRows, ['hide industries tags'])),
    hideSolutions: toBoolean(getSetting(settingsRows, ['hide solutions tags'])),
    show: getSetting(settingsRows, ['show partner display'], 'false'),
    heading: getSetting(settingsRows, ['heading'], 'Partners'),
    delay: getSetting(settingsRows, ['auto play delay'], '5'),
    autoplay: getSetting(settingsRows, ['enable autoplay'], 'false'),
    variant: getSetting(settingsRows, ['carousel variant'], 'static'),
  };

  leftColumn.className = 'article-body-left-column';
  rightColumn.className = 'article-body-right-column';

  contentRows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    leftColumn.append(cells[0]);
    if (cells[1]) rightColumn.append(cells[1]);
  });

  block.replaceChildren(leftColumn, rightColumn);
  block.classList.add('article-body-ctn');
  await decorateNestedBlocks(leftColumn);
  if (settings.hideIndustries) block.classList.add('article-body-hide-industries-tags');
  if (settings.hideSolutions) block.classList.add('article-body-hide-solutions-tags');
  const partnerDisplay = buildPartnerDisplay(partners, settings);
  if (partnerDisplay) rightColumn.append(partnerDisplay);
  decorateSidebar(rightColumn, block);
}
