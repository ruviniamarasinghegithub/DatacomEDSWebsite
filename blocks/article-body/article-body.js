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

function createTagLink(href, label) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label || href;
  return link;
}

function parseTagValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directUrlMatch = trimmed.match(/^(https?:\/\/\S+)$/i);
  if (directUrlMatch) return createTagLink(directUrlMatch[1], directUrlMatch[1]);

  const labelUrlMatch = trimmed.match(/^(.*?)(?:\s*[|>→-]\s*|\s*\(\s*)(https?:\/\/\S+)(?:\s*\))?$/i);
  if (labelUrlMatch) {
    const label = labelUrlMatch[1].trim();
    const href = labelUrlMatch[2].trim();
    return createTagLink(href, label || href);
  }

  return trimmed;
}

function getTagItems(cell) {
  const links = [...(cell?.querySelectorAll('a') || [])];
  if (links.length) return links.map((link) => link.cloneNode(true));

  return getText(cell)
    .split(/[,;\n]+/)
    .map((tag) => parseTagValue(tag))
    .filter(Boolean);
}

function buildTagSection(title, items, className) {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  const list = document.createElement('ul');
  section.className = `article-body-tag-ctn ${className}`;
  heading.textContent = title;
  list.className = 'article-body-tag-list';

  items.forEach((item) => {
    const listItem = document.createElement('li');
    if (typeof item === 'string') {
      listItem.textContent = item;
    } else {
      listItem.append(item);
    }
    list.append(listItem);
  });

  section.append(heading, list);
  return section;
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

async function decorateNestedBlocks(container) {
  const nestedBlocks = [];
  [...container.querySelectorAll('table')].forEach((table) => {
    const rows = [...table.rows];
    const blockName = rows[0]?.cells[0]?.textContent.trim().toLowerCase();
    if (!blockName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(blockName) || rows[0].cells.length !== 1) return;

    const nestedBlock = document.createElement('div');
    nestedBlock.className = blockName;
    rows.slice(1)
      .filter((row) => {
        const rowText = row.textContent.trim();
        const firstCellText = row.querySelector('td, th, div, p')?.textContent.trim() || '';
        const normalized = (firstCellText || rowText).trim();
        return !normalized.toLowerCase().startsWith('id:')
          && !normalized.toLowerCase().startsWith(`${blockName}:`)
          && normalized.toLowerCase() !== blockName
          && normalized.toLowerCase() !== blockName.replace(/-/g, ' ')
          && normalized.toLowerCase() !== 'article body text'
          && normalized.toLowerCase() !== 'social shares claps bar';
      })
      .forEach((row) => {
        const blockRow = document.createElement('div');
        [...row.cells].forEach((cell) => {
          const blockCell = document.createElement('div');
          blockCell.append(...cell.childNodes);
          blockRow.append(blockCell);
        });
        nestedBlock.append(blockRow);
      });
    table.replaceWith(nestedBlock);
    nestedBlocks.push(nestedBlock);
  });

  const topLevelBlocks = nestedBlocks.filter((candidate) => (
    !nestedBlocks.some((other) => other !== candidate && other.contains(candidate))
  ));

  for (let index = 0; index < topLevelBlocks.length; index += 1) {
    const nestedBlock = topLevelBlocks[index];
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
  const industryTags = [];
  const solutionTags = [];
  let inCarouselContent = false;
  let currentPartner = null;

  rows.forEach((row) => {
    const cells = [...row.children];
    const label = normalizeLabel(getText(cells[0]));
    const rowText = row.textContent.trim();
    const firstCellText = cells[0]?.textContent.trim() || '';

    if ((firstCellText || rowText).toLowerCase().startsWith('id:')) {
      const id = (firstCellText || rowText).slice(3).trim();
      if (id) block.id = id;
      return;
    }

    if (label === 'field' && normalizeLabel(getText(cells[1])) === 'value') {
      return;
    }
    if (['industries', 'industry', 'industry tags', 'related industries'].includes(label)) {
      industryTags.push(...getTagItems(cells[1]));
      return;
    }
    if (['solutions', 'solution', 'solution tags', 'related solutions'].includes(label)) {
      solutionTags.push(...getTagItems(cells[1]));
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

  rightColumn.append(
    buildTagSection('Related industries', industryTags, 'industries-tags'),
    buildTagSection('Related solutions', solutionTags, 'solutions-tags'),
  );

  block.replaceChildren(leftColumn, rightColumn);
  block.classList.add('article-body-ctn');
  await decorateNestedBlocks(leftColumn);
  if (settings.hideIndustries) block.classList.add('article-body-hide-industries-tags');
  if (settings.hideSolutions) block.classList.add('article-body-hide-solutions-tags');
  const partnerDisplay = buildPartnerDisplay(partners, settings);
  if (partnerDisplay) rightColumn.append(partnerDisplay);
  decorateSidebar(rightColumn, block);
}
