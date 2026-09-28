function getVariant(block, name) {
  return block.classList.contains(`article-body-${name}`)
    || block.classList.contains(name);
}

function getText(cell) {
  return cell?.textContent.trim() || '';
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

  const path = getText(cell);
  if (!path) return null;
  const result = document.createElement('img');
  result.src = path;
  result.alt = alt;
  return result;
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
      partner.cells[1],
      getText(partner.cells[2]),
      toBoolean(getText(partner.cells[3])),
    );

    link.href = getText(partner.cells[4]) || '#';
    link.target = toBoolean(getText(partner.cells[5])) ? '_blank' : '_self';
    link.rel = link.target === '_blank' ? 'noopener noreferrer' : '';
    link.setAttribute('aria-label', getText(partner.cells[0]));
    if (image) link.append(image);
    const name = document.createElement('span');
    name.textContent = getText(partner.cells[0]);
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

export default function decorate(block) {
  const rows = [...block.children];
  const leftColumn = document.createElement('div');
  const rightColumn = document.createElement('aside');
  const settingsRows = [];
  const contentRows = [];
  const partners = [];
  let inCarouselContent = false;

  rows.forEach((row) => {
    const cells = [...row.children];
    const label = getText(cells[0]).toLowerCase();
    if (label === 'carousel content') {
      inCarouselContent = true;
    } else if (inCarouselContent && label === 'partner name') {
      // Partner rows use: name, image, alt text, use DAM alt, URL, new tab.
      partners.push({ cells });
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
  if (settings.hideIndustries) block.classList.add('article-body-hide-industries-tags');
  if (settings.hideSolutions) block.classList.add('article-body-hide-solutions-tags');
  const partnerDisplay = buildPartnerDisplay(partners, settings);
  if (partnerDisplay) rightColumn.append(partnerDisplay);
  decorateSidebar(rightColumn, block);
}
