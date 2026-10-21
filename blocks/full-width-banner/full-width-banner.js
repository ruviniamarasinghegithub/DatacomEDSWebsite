import { decorateBlock, loadBlock, toClassName } from '../../scripts/aem.js';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const animationText = new WeakMap();
const DOCUMENT_FIELDS = {
  image: 'image',
  mainimage: 'image',
  imagealt: 'imageAlt',
  imagealttext: 'imageAlt',
  mainimagealt: 'imageAlt',
  mainimagealttext: 'imageAlt',
  logo: 'logo',
  contentlogo: 'logo',
  contentlogoalt: 'logoAlt',
  logoalt: 'logoAlt',
  logoalttext: 'logoAlt',
  subheading: 'subheading',
  contentsubheading: 'subheading',
  contenttitle: 'heading',
  mainheading: 'heading',
  heading: 'heading',
  description: 'description',
  contentdescription: 'description',
  buttontext: 'ctaText',
  link: 'ctaLink',
  cta: 'cta',
  ctabutton: 'cta',
  calltoaction: 'cta',
};

function isElement(node) {
  return node?.nodeType === Node.ELEMENT_NODE;
}

function hasNonMediaContent(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('picture, img').forEach((node) => node.remove());
  return clone.textContent.trim().length > 0 || clone.children.length > 0;
}

function unwrapMixedParagraphs(cell) {
  [...cell.querySelectorAll('p')].forEach((paragraph) => {
    const picture = paragraph.querySelector('picture, img');
    const heading = paragraph.querySelector(HEADING_SELECTOR);
    if (picture && (heading || hasNonMediaContent(paragraph))) {
      paragraph.replaceWith(...paragraph.childNodes);
    }
  });
}

function isPictureOnly(element) {
  if (!isElement(element)) return false;
  if (element.matches('picture, img')) return true;
  if (!element.querySelector('picture, img')) return false;
  return !hasNonMediaContent(element) && !element.querySelector('a');
}

function pictureFrom(node) {
  if (!isElement(node)) return null;
  if (node.matches('picture, img')) return node;
  if (isPictureOnly(node)) return node.querySelector('picture, img');
  return null;
}

function standaloneLink(node) {
  if (!isElement(node)) return null;
  if (node.matches('a[href]')) return node;
  if (!node.matches('p')) return null;
  const links = [...node.querySelectorAll('a[href]')];
  if (links.length !== 1) return null;
  const [link] = links;
  const remainder = node.textContent.replace(link.textContent, '').trim();
  return remainder ? null : link;
}

function meaningfulNodes(parent) {
  return [...parent.childNodes].flatMap((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (!text) return [];
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return [paragraph];
    }
    return isElement(node) ? [node] : [];
  });
}

function repairCta(cta) {
  [...cta.querySelectorAll('p')].forEach((paragraph) => {
    const cells = [...paragraph.children].filter((child) => child.tagName === 'DIV');
    if (cells.length >= 2) paragraph.replaceWith(...paragraph.childNodes);
  });
}

function takeCtas(block) {
  [...block.querySelectorAll('table')].forEach((table) => {
    const rows = [...table.rows].filter((row) => row.closest('table') === table);
    const header = rows.shift()?.textContent.trim() || '';
    const [, name, variants = ''] = header.match(/^([^()]+)(?:\(([^)]+)\))?$/) || [];
    if (!name || toClassName(name) !== 'cta-button') return;
    const cta = document.createElement('div');
    cta.className = 'cta-button';
    variants.split(',').map((variant) => toClassName(variant)).filter(Boolean)
      .forEach((variant) => cta.classList.add(variant));
    rows.forEach((row) => {
      const ctaRow = document.createElement('div');
      [...row.cells].forEach((cell) => {
        const ctaCell = document.createElement('div');
        ctaCell.append(...cell.childNodes);
        ctaRow.append(ctaCell);
      });
      cta.append(ctaRow);
    });
    table.replaceWith(cta);
  });

  [...block.children].filter((row) => {
    const label = row.firstElementChild?.textContent.trim().toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return label === 'cta' || label === 'ctabutton' || label === 'calltoaction';
  }).forEach((row) => {
    const valueCell = row.children[1];
    if (!valueCell || valueCell.querySelector('.cta-button, table')) return;

    const ctaRows = [...valueCell.children].filter((fieldRow) => {
      const label = fieldRow.firstElementChild?.textContent.trim()
        .replace(/\s*\([^)]*\)\s*\*?\s*$/, '')
        .replace(/\s*\*+\s*$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      return ['buttontext', 'buttonlink', 'link', 'buttonstyle', 'buttontheme'].includes(label);
    });
    if (!ctaRows.length) return;

    const cta = document.createElement('div');
    cta.className = 'cta-button';
    cta.append(...valueCell.childNodes);
    valueCell.append(cta);
  });

  const ctas = [...block.querySelectorAll('.cta-button')];
  ctas.forEach((cta) => {
    let node = cta.parentElement;
    cta.remove();
    while (node && node !== block && !node.children.length && !node.textContent.trim()) {
      const { parentElement } = node;
      node.remove();
      node = parentElement;
    }
  });
  return ctas;
}

function normalizeLabel(value) {
  return value.trim()
    .replace(/\s*\*+\s*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function documentField(row) {
  if (row.children.length < 2) return null;
  return DOCUMENT_FIELDS[normalizeLabel(row.firstElementChild?.textContent || '')] || null;
}

function appendCell(target, cell) {
  if (cell) target.append(...cell.childNodes);
}

function toSubheading(node) {
  if (!node.matches(HEADING_SELECTOR)) return node;
  const paragraph = document.createElement('p');
  paragraph.append(...node.childNodes);
  return paragraph;
}

function toMainHeading(node) {
  if (!node || node.tagName === 'H1') return node;
  const heading = document.createElement('h1');
  [...node.attributes].forEach(({ name, value }) => heading.setAttribute(name, value));
  heading.append(...node.childNodes);
  return heading;
}

function appendDocumentHeading(target, cell) {
  if (!cell?.textContent.trim()) return;
  const authoredHeading = cell.querySelector(HEADING_SELECTOR);
  if (authoredHeading) {
    target.append(toMainHeading(authoredHeading));
    return;
  }

  const heading = document.createElement('h1');
  const content = cell.firstElementChild || cell;
  heading.append(...content.childNodes);
  target.append(heading);
}

function buildDocumentCta(textCell, linkCell) {
  if (!textCell && !linkCell) return null;
  const cta = document.createElement('div');
  cta.className = 'cta-button tertiary';

  const textRow = document.createElement('div');
  const textLabel = document.createElement('div');
  const textValue = document.createElement('div');
  textLabel.textContent = 'Button text';
  if (textCell) {
    textValue.append(...textCell.childNodes);
  }
  textRow.append(textLabel, textValue);

  const linkRow = document.createElement('div');
  const linkLabel = document.createElement('div');
  const linkValue = document.createElement('div');
  linkLabel.textContent = 'Link';
  if (linkCell) {
    linkValue.append(...linkCell.childNodes);
  }
  linkRow.append(linkLabel, linkValue);

  cta.append(textRow, linkRow);
  return cta;
}

function collectLabeledRows(block) {
  const media = document.createElement('div');
  const content = document.createElement('div');
  const fields = new Map();

  [...block.children].forEach((row) => {
    const field = documentField(row);
    const value = row.children[1];
    if (field && value) fields.set(field, value);
  });

  const imageCell = fields.get('image');
  if (imageCell) {
    appendCell(media, imageCell);
  }

  const mainImage = media.querySelector('img');
  const mainImageAlt = fields.get('imageAlt')?.textContent.trim();
  if (mainImage && mainImageAlt !== undefined) mainImage.alt = mainImageAlt;

  const logoCell = fields.get('logo');
  const logo = logoCell?.querySelector('img');
  const logoAlt = fields.get('logoAlt')?.textContent.trim();
  if (logo && logoAlt !== undefined) logo.alt = logoAlt;

  const logoPicture = logoCell?.querySelector('picture, img') || null;
  const subheading = fields.get('subheading') ? meaningfulNodes(fields.get('subheading')) : [];
  const description = fields.get('description') ? meaningfulNodes(fields.get('description')) : [];
  const links = fields.get('cta')
    ? meaningfulNodes(fields.get('cta')).map(standaloneLink).filter(Boolean) : [];
  appendCell(content, logoCell);
  content.append(...subheading);
  appendDocumentHeading(content, fields.get('heading'));
  content.append(...description);
  appendCell(content, fields.get('cta'));

  const cta = buildDocumentCta(fields.get('ctaText'), fields.get('ctaLink'));
  return {
    media,
    content,
    ctas: cta ? [cta] : [],
    labeledContent: {
      logo: logoPicture,
      subheading: subheading.map(toSubheading),
      mainHeading: content.querySelector('h1'),
      description,
      links,
    },
  };
}

function collectTwoColumnRows(block) {
  const media = document.createElement('div');
  const content = document.createElement('div');
  let mainAssigned = false;

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => unwrapMixedParagraphs(cell));
    const cells = [...row.children];
    if (cells.length >= 2) {
      const [mediaCell, ...contentCells] = cells;
      media.append(...mediaCell.childNodes);
      contentCells.forEach((cell) => content.append(...cell.childNodes));
      if (media.querySelector('picture, img')) mainAssigned = true;
      return;
    }
    if (cells.length !== 1) return;
    const [cell] = cells;
    if (!mainAssigned && isPictureOnly(cell)) {
      media.append(...cell.childNodes);
      mainAssigned = true;
      return;
    }
    content.append(...cell.childNodes);
  });

  return { media, content };
}

function collectColumns(block) {
  const labeledRows = [...block.children].filter((row) => documentField(row));
  return labeledRows.length
    ? collectLabeledRows(block)
    : collectTwoColumnRows(block);
}

function classifyContent(content) {
  const nodes = meaningfulNodes(content);
  const headings = nodes.filter((node) => node.matches?.(HEADING_SELECTOR));
  const authoredHeading = headings.find((node) => node.tagName === 'H1')
    || headings[0]
    || null;
  const mainHeading = toMainHeading(authoredHeading);
  const subheading = [];
  const description = [];
  const links = [];
  let logo = null;
  let passedHeading = false;

  nodes.forEach((node) => {
    const picture = pictureFrom(node);
    if (picture && !logo) {
      logo = picture;
      return;
    }
    const link = standaloneLink(node);
    if (link) {
      links.push(link);
      return;
    }
    if (node === authoredHeading) {
      passedHeading = true;
      return;
    }
    if (!passedHeading) subheading.push(toSubheading(node));
    else description.push(node);
  });

  return {
    logo,
    subheading,
    mainHeading,
    description,
    links,
  };
}

function prepareImage(image, priority) {
  const img = image?.matches?.('img') ? image : image?.querySelector?.('img');
  if (!img) return;
  if (!img.hasAttribute('alt')) img.alt = '';
  if (!priority) return;
  img.loading = 'eager';
  img.setAttribute('fetchpriority', 'high');
}

function appendGroup(parent, className, nodes) {
  if (!nodes.length) return;
  if (nodes.length === 1) {
    nodes[0].classList.add(className);
    parent.append(nodes[0]);
    return;
  }
  const group = document.createElement('div');
  group.className = className;
  group.append(...nodes);
  parent.append(group);
}

function ctaVariant(link) {
  if (link.classList.contains('secondary')) return 'secondary';
  if (link.classList.contains('tertiary')) return 'tertiary';
  return 'primary';
}

function buildCtaFromLink(link) {
  const cta = document.createElement('div');
  cta.className = `cta-button ${ctaVariant(link)}`;

  const textRow = document.createElement('div');
  const textLabel = document.createElement('div');
  textLabel.textContent = 'Button text';
  const textValue = document.createElement('div');
  textValue.textContent = link.textContent.trim();
  textRow.append(textLabel, textValue);

  const linkRow = document.createElement('div');
  const linkLabel = document.createElement('div');
  linkLabel.textContent = 'Link';
  const linkValue = document.createElement('div');
  linkValue.append(link);
  linkRow.append(linkLabel, linkValue);

  cta.append(textRow, linkRow);
  return cta;
}

function buildCopy(content, ctas) {
  const copy = document.createElement('div');
  copy.className = 'full-width-banner-copy';
  const {
    logo, subheading, mainHeading, description, links,
  } = content;

  if (logo) {
    prepareImage(logo, false);
    const logoWrap = document.createElement('div');
    logoWrap.className = 'full-width-banner-logo';
    logoWrap.append(logo);
    copy.append(logoWrap);
  }

  appendGroup(copy, 'full-width-banner-subheading', subheading);

  if (mainHeading) {
    mainHeading.classList.add('full-width-banner-heading', 'h1');
    copy.append(mainHeading);
  }

  if (description.length) {
    const descriptionWrap = document.createElement('div');
    descriptionWrap.className = 'full-width-banner-description';
    descriptionWrap.append(...description);
    copy.append(descriptionWrap);
  }

  const actions = [...ctas, ...links.map(buildCtaFromLink)];
  if (actions.length) {
    const actionWrap = document.createElement('div');
    actionWrap.className = 'full-width-banner-actions';
    actionWrap.append(...actions);
    copy.append(actionWrap);
  }

  return copy;
}

function splitTextLines(element) {
  const text = animationText.get(element) || element.textContent.trim();
  if (!text) return;
  animationText.set(element, text);

  const words = text.split(/\s+/);
  const measuringWords = words.map((word) => {
    const span = document.createElement('span');
    span.textContent = `${word.replace(/-/g, '\u2011')} `;
    return span;
  });
  element.replaceChildren(...measuringWords);

  const lines = [];
  let currentLine = [];
  let currentTop;
  measuringWords.forEach((word) => {
    const { top } = word.getBoundingClientRect();
    if (currentTop !== undefined && Math.abs(top - currentTop) > 1) {
      lines.push(currentLine);
      currentLine = [];
    }
    currentTop = top;
    currentLine.push(word.textContent.trim());
  });
  if (currentLine.length) lines.push(currentLine);

  const lineElements = lines.map((line) => {
    const lineClip = document.createElement('span');
    lineClip.className = 'full-width-banner-animation-line';
    const lineText = document.createElement('span');
    lineText.textContent = line.join(' ');
    lineClip.append(lineText);
    return lineClip;
  });
  element.replaceChildren(...lineElements);
  element.classList.add('full-width-banner-animation-text');
}

function getAnimationTextElements(copy) {
  const elements = [];
  const subheading = copy.querySelector('.full-width-banner-subheading');
  if (subheading) {
    const children = [...subheading.querySelectorAll(':scope > p')];
    elements.push(...(children.length ? children : [subheading]));
  }

  const heading = copy.querySelector('.full-width-banner-heading');
  if (heading) elements.push(heading);

  const description = copy.querySelector('.full-width-banner-description');
  if (description) {
    const children = [...description.querySelectorAll('p, li')];
    elements.push(...(children.length ? children : [description]));
  }
  return elements;
}

function setupAnimation(block) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const copy = block.querySelector('.full-width-banner-copy');
  if (!copy) return;

  const textElements = getAnimationTextElements(copy);
  const splitElements = textElements.filter((element) => {
    if (element.querySelector('a, button, picture, img')) {
      element.classList.add('full-width-banner-animation-fallback');
      return false;
    }
    splitTextLines(element);
    return true;
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => splitElements.forEach(splitTextLines));
  }

  if ('ResizeObserver' in window) {
    let width = copy.offsetWidth;
    let frame;
    const observer = new ResizeObserver(() => {
      if (copy.offsetWidth === width) return;
      width = copy.offsetWidth;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => splitElements.forEach(splitTextLines));
    });
    observer.observe(copy);
  }

  window.setTimeout(() => {
    if (!block.isConnected) return;
    block.classList.add('full-width-banner-animate');
  }, 500);
}

/**
 * Decorates a full-width banner.
 * @param {Element} block The banner block.
 */
export default async function decorate(block) {
  const ctas = takeCtas(block);
  const {
    media, content, ctas: documentCtas = [], labeledContent,
  } = collectColumns(block);
  const mainImage = media.querySelector('picture, img');
  prepareImage(mainImage, true);

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'full-width-banner-media';
  if (mainImage) mediaWrap.append(mainImage);

  const overlay = document.createElement('div');
  overlay.className = 'full-width-banner-overlay';
  const inner = document.createElement('div');
  inner.className = 'full-width-banner-inner';
  inner.append(buildCopy(labeledContent || classifyContent(content), [...ctas, ...documentCtas]));
  overlay.append(inner);
  block.replaceChildren(mediaWrap, overlay);

  const nestedCtas = [...block.querySelectorAll('.cta-button')];
  await Promise.all(nestedCtas.map(async (cta) => {
    repairCta(cta);
    decorateBlock(cta);
    await loadBlock(cta);
  }));
  setupAnimation(block);
}
