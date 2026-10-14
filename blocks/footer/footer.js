import { decorateIcons, getMetadata, loadCSS } from '../../scripts/aem.js';

const HEADING_SELECTOR = 'h2, h3, h4, h5, h6';
const SHIELDED_SITE_SCRIPT = 'https://staticcdn.co.nz/embed/embed.js';

let footerInstance = 0;

async function loadFooterDocument(path) {
  if (!path?.startsWith('/') || path.startsWith('//')) {
    throw new Error('Footer content must use a local page path.');
  }

  const documentPath = path.replace(/(\.plain)?\.html$/, '');
  const response = await fetch(`${documentPath}.plain.html`);
  if (!response.ok) throw new Error(`Failed to load footer ${documentPath}: ${response.status}`);

  const fragment = document.createElement('main');
  fragment.innerHTML = await response.text();

  const resetMediaBase = (tag, attribute) => {
    fragment.querySelectorAll(`${tag}[${attribute}^="./media_"]`).forEach((element) => {
      const mediaUrl = new URL(
        element.getAttribute(attribute),
        new URL(documentPath, window.location),
      );
      element.setAttribute(attribute, mediaUrl.href);
    });
  };
  resetMediaBase('img', 'src');
  resetMediaBase('source', 'srcset');
  decorateIcons(fragment);
  return fragment;
}

function isDatacomLocaleUrl(url) {
  return /(^|\.)datacom\.com$/i.test(url.hostname)
    && /^\/[^/]+\/en(?:\/|$)/i.test(url.pathname);
}

function getCountryCode(url) {
  try {
    const [country] = new URL(url, window.location).pathname.split('/').filter(Boolean);
    return /^[a-z]{2}$/i.test(country) ? country.toLowerCase() : '';
  } catch {
    return '';
  }
}

function localizeDatacomLink(link, currentCountry) {
  if (!['nz', 'au'].includes(currentCountry)) return;

  try {
    const url = new URL(link.href, window.location);
    if (!isDatacomLocaleUrl(url)) return;

    const segments = url.pathname.split('/').filter(Boolean);
    if (!segments.length || segments[0].toLowerCase() === currentCountry) return;

    segments[0] = currentCountry;
    const trailingSlash = url.pathname.endsWith('/') ? '/' : '';
    url.pathname = `/${segments.join('/')}${trailingSlash}`;
    link.href = url.href;
  } catch {
    // Leave malformed authored links unchanged.
  }
}

function decorateLinks(container) {
  const currentCountry = getCountryCode(window.location.href);
  container.querySelectorAll('a[href]').forEach((link) => {
    try {
      localizeDatacomLink(link, currentCountry);
      const url = new URL(link.href, window.location);
      const isExternal = ['http:', 'https:'].includes(url.protocol)
        && url.origin !== window.location.origin
        && !isDatacomLocaleUrl(url);
      if (isExternal) {
        link.classList.add('footer-external-link');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        if (!link.querySelector('img, picture, .icon')) {
          const icon = document.createElement('img');
          icon.className = 'footer-external-link-icon';
          icon.src = `${window.hlx.codeBasePath}/icons/footer-external-link.svg`;
          icon.alt = '';
          icon.setAttribute('aria-hidden', 'true');
          link.append(icon);
        }
      }
    } catch {
      // Leave malformed authored links unchanged.
    }
  });
}

function loadScript(src) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(), { once: true });
      });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(), { once: true });
    document.head.append(script);
  });
}

function isShieldedSiteLink(anchor) {
  const title = anchor.getAttribute('title')?.trim().toLowerCase();
  const label = anchor.textContent.trim().toLowerCase();
  return title === 'shielded-site' || label === 'shielded site';
}

async function decorateShieldedSite(container) {
  const link = [...container.querySelectorAll('a[href]')].find(isShieldedSiteLink);
  if (!link) return;

  link.id = 'shielded-logo';
  link.classList.remove('footer-external-link');
  link.querySelector(':scope > .footer-external-link-icon')?.remove();
  link.removeAttribute('target');
  link.removeAttribute('rel');

  try {
    await loadScript(SHIELDED_SITE_SCRIPT);
    const ShieldedSite = window.ds07o6pcmkorn;
    if (typeof ShieldedSite !== 'function') return;
    const frame = new ShieldedSite({ openElementId: '#shielded-logo' });
    frame.init();
  } catch (error) {
    // Leave the authored link usable if the third-party script fails.
    // eslint-disable-next-line no-console
    console.error('Footer: failed to initialize Shielded Site.', error);
  }
}

function isIconImage(img) {
  const sources = [
    img.currentSrc,
    img.getAttribute('src'),
    ...[...img.closest('picture')?.querySelectorAll('source') || []]
      .map((source) => source.getAttribute('srcset')),
  ].filter(Boolean);
  return sources.some((source) => /\.(svg|png)(?:[?#]|$)/i.test(source));
}

function decorateLinkIcons(container) {
  [...container.querySelectorAll('img')].filter(isIconImage).forEach((img) => {
    const icon = img.closest('picture, .icon') || img;
    const item = img.closest('li') || img.closest('p');
    const link = img.closest('a[href]') || item?.querySelector('a[href]');
    if (!link) return;

    if (!link.contains(icon)) link.append(icon);
    link.classList.add('footer-link-with-icon');
    icon.classList.add('footer-link-icon');
  });
}

function isRegionSelectorHeading(heading) {
  return heading.textContent.trim().toLowerCase() === 'change location';
}

function getContentAfterHeading(heading) {
  const content = [];
  let sibling = heading.nextSibling;
  while (sibling
    && !(sibling.nodeType === Node.ELEMENT_NODE && sibling.matches(HEADING_SELECTOR))) {
    const { nextSibling } = sibling;
    content.push(sibling);
    sibling = nextSibling;
  }
  return content;
}

function createRegionOption(link, idPrefix, index) {
  const option = document.createElement('li');
  option.className = 'footer-region-selector-option';
  option.id = `${idPrefix}-region-option-${index}`;
  option.tabIndex = -1;
  option.dataset.value = link.href;
  option.setAttribute('role', 'option');
  option.setAttribute('aria-selected', 'false');

  const label = document.createElement('span');
  label.textContent = link.textContent.trim();
  const icon = link.querySelector('picture, .icon, img');
  if (icon) {
    icon.classList.remove('footer-link-icon');
    icon.classList.add('footer-region-selector-option-icon');
    option.append(icon);
  }
  option.append(label);
  return option;
}

function updateRegionSelectorValue(value, options, selected) {
  options.forEach((option) => option.setAttribute('aria-selected', String(option === selected)));
  value.replaceChildren();
  const icon = selected.querySelector('.footer-region-selector-option-icon');
  if (icon) value.append(icon.cloneNode(true));
  const label = document.createElement('span');
  label.textContent = selected.textContent.trim();
  value.append(label);
}

function getRegionDestination(destination) {
  try {
    const selectedUrl = new URL(destination, window.location);
    const selectedCountry = getCountryCode(selectedUrl.href);
    const currentCountry = getCountryCode(window.location.href);
    if (!selectedCountry || !currentCountry) return selectedUrl.href;

    const currentUrl = new URL(window.location.href);
    const currentSegments = currentUrl.pathname.split('/').filter(Boolean);
    currentSegments[0] = selectedCountry;
    const trailingSlash = currentUrl.pathname.endsWith('/') ? '/' : '';
    currentUrl.pathname = `/${currentSegments.join('/')}${trailingSlash}`;
    return currentUrl.href;
  } catch {
    return destination;
  }
}

async function decorateRegionSelector(container, idPrefix) {
  const heading = [...container.querySelectorAll(HEADING_SELECTOR)]
    .find(isRegionSelectorHeading);
  if (!heading) return;

  const content = getContentAfterHeading(heading);
  const listIndex = content
    .findIndex((node) => node.nodeType === Node.ELEMENT_NODE && node.matches('ul, ol'));
  if (listIndex < 0) return;

  const regionContent = content.slice(0, listIndex + 1);
  const list = content[listIndex];
  const links = [...list?.querySelectorAll('a[href]') || []];
  if (!links.length) return;

  await Promise.all([
    loadCSS(`${window.hlx.codeBasePath}/blocks/footer/footer-modal.css`),
    loadCSS(`${window.hlx.codeBasePath}/blocks/cta-button/cta-button.css`),
  ]);

  const dialogId = `${idPrefix}-region-dialog`;
  const headingId = heading.id || `${idPrefix}-region-heading`;
  const selectId = `${idPrefix}-region-select`;
  const optionsId = `${idPrefix}-region-options`;

  const trigger = document.createElement('a');
  trigger.className = 'footer-region-selector-trigger';
  trigger.href = `#${dialogId}`;
  const triggerLabel = document.createElement('span');
  triggerLabel.textContent = heading.textContent.trim();
  const triggerIcon = document.createElement('img');
  triggerIcon.className = 'footer-region-selector-trigger-icon';
  triggerIcon.src = `${window.hlx.codeBasePath}/icons/footer-globe-placeholder.svg`;
  triggerIcon.alt = '';
  trigger.append(triggerLabel, triggerIcon);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialogId);

  const dialog = document.createElement('dialog');
  dialog.className = 'footer-region-selector-dialog';
  dialog.id = dialogId;
  dialog.setAttribute('aria-labelledby', headingId);

  const panel = document.createElement('div');
  panel.className = 'footer-region-selector-panel';

  const close = document.createElement('button');
  close.className = 'footer-region-selector-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close location selector');
  const closeIcon = document.createElement('i');
  closeIcon.className = 'fal fa-times';
  closeIcon.setAttribute('aria-hidden', 'true');
  closeIcon.textContent = '\u00d7';
  close.append(closeIcon);

  heading.id = headingId;
  heading.classList.add('footer-region-selector-heading');

  const description = regionContent.filter((node) => node !== list);
  const label = document.createElement('label');
  label.setAttribute('for', selectId);
  label.textContent = 'Choose a location';

  const form = document.createElement('form');
  form.className = 'footer-region-selector-form cta-button';
  const field = document.createElement('div');
  field.className = 'footer-region-selector-field';
  const dropdown = document.createElement('button');
  dropdown.className = 'footer-region-selector-input';
  dropdown.id = selectId;
  dropdown.type = 'button';
  dropdown.setAttribute('aria-haspopup', 'listbox');
  dropdown.setAttribute('aria-expanded', 'false');
  dropdown.setAttribute('aria-controls', optionsId);
  const value = document.createElement('span');
  value.className = 'footer-region-selector-value';
  value.textContent = 'Select a location';
  const fieldIcon = document.createElement('i');
  fieldIcon.className = 'fal fa-angle-down footer-region-selector-field-icon';
  fieldIcon.setAttribute('aria-hidden', 'true');
  dropdown.append(value);

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'footer-region-selector-options';
  optionsContainer.hidden = true;
  const optionsList = document.createElement('ul');
  optionsList.id = optionsId;
  optionsList.setAttribute('role', 'listbox');
  const options = links.map((link, index) => createRegionOption(link, idPrefix, index));
  optionsList.append(...options);
  optionsContainer.append(optionsList);

  const submit = document.createElement('button');
  submit.className = 'footer-region-selector-submit cta-button-link';
  submit.type = 'submit';
  submit.disabled = true;
  submit.textContent = 'Continue';
  field.append(label, dropdown, fieldIcon, optionsContainer);
  form.append(field, submit);

  heading.replaceWith(trigger);
  regionContent.forEach((node) => node.remove());
  panel.append(close, heading, ...description, form);
  dialog.append(panel);
  trigger.after(dialog);

  const syncDialogScroll = () => {
    if (!dialog.open) return;
    dialog.classList.remove('is-content-fitting');
    window.requestAnimationFrame(() => {
      const contentFits = dialog.scrollHeight <= dialog.clientHeight + 1;
      dialog.classList.toggle('is-content-fitting', contentFits);
      if (contentFits) dialog.scrollTop = 0;
    });
  };

  let previousBodyOverflow = '';
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    previousBodyOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    syncDialogScroll();
    dropdown.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', ({ target }) => {
    if (target === dialog) dialog.close();
  });

  let selectedValue = '';
  let dropdownCloseTimer;
  const dropdownReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const closeDropdown = () => {
    window.clearTimeout(dropdownCloseTimer);
    field.classList.remove('is-open');
    dropdown.setAttribute('aria-expanded', 'false');
    const hideOptions = () => {
      if (!field.classList.contains('is-open')) optionsContainer.hidden = true;
    };
    if (dropdownReducedMotion.matches) hideOptions();
    else dropdownCloseTimer = window.setTimeout(hideOptions, 120);
    syncDialogScroll();
  };
  const openDropdown = () => {
    window.clearTimeout(dropdownCloseTimer);
    optionsContainer.hidden = false;
    optionsContainer.getBoundingClientRect();
    field.classList.add('is-open');
    dropdown.setAttribute('aria-expanded', 'true');
    const selected = options.find((option) => option.getAttribute('aria-selected') === 'true');
    (selected || options[0]).focus();
    syncDialogScroll();
  };
  const selectOption = (option) => {
    selectedValue = option.dataset.value;
    updateRegionSelectorValue(value, options, option);
    submit.disabled = false;
    closeDropdown();
    dropdown.focus();
  };

  const currentCountry = getCountryCode(window.location.href);
  const currentOption = options
    .find((option) => getCountryCode(option.dataset.value) === currentCountry);
  if (currentOption) {
    selectedValue = currentOption.dataset.value;
    updateRegionSelectorValue(value, options, currentOption);
    submit.disabled = false;
  }

  dropdown.addEventListener('click', () => {
    if (!field.classList.contains('is-open')) openDropdown();
    else closeDropdown();
  });
  dropdown.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openDropdown();
    }
  });
  options.forEach((option, index) => {
    option.addEventListener('click', () => selectOption(option));
    option.addEventListener('keydown', (event) => {
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        selectOption(option);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDropdown();
        dropdown.focus();
      } else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const offset = event.key === 'ArrowDown' ? 1 : -1;
        options[(index + offset + options.length) % options.length].focus();
      }
    });
  });
  field.addEventListener('focusout', () => {
    window.requestAnimationFrame(() => {
      if (!field.contains(document.activeElement)) closeDropdown();
    });
  });
  dialog.addEventListener('close', () => {
    closeDropdown();
    dialog.classList.remove('is-content-fitting');
    document.body.style.overflow = previousBodyOverflow;
  });
  window.addEventListener('resize', syncDialogScroll);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!selectedValue) return;
    window.sessionStorage.setItem('change-location', 'true');
    window.location.assign(getRegionDestination(selectedValue));
  });
}

async function decorateHardcodedRegionSelector(container, idPrefix) {
  if ([...container.querySelectorAll(HEADING_SELECTOR)].some(isRegionSelectorHeading)) {
    await decorateRegionSelector(container, idPrefix);
    return;
  }
  if (getMetadata('hide-change-location')?.toLowerCase() === 'true') return;

  const column = container.querySelector('.footer-copyright-column')
    || container.querySelector('.footer-column:last-child');
  if (!column) return;

  let footerList = column.querySelector(':scope > ul');
  if (!footerList) {
    footerList = document.createElement('ul');
    column.prepend(footerList);
  }

  const item = document.createElement('li');
  const heading = document.createElement('h3');
  heading.textContent = 'Change location';
  const description = document.createElement('p');
  description.textContent = 'Choose your country or region to see content specific to your location.';
  const regionList = document.createElement('ul');
  [
    {
      label: 'New Zealand',
      icon: '/icons/flags/NZ.png',
      url: 'https://datacom.com/nz/en',
    },
    {
      label: 'Australia',
      icon: '/icons/flags/AU.png',
      url: 'https://datacom.com/au/en',
    },
  ].forEach(({ label, icon, url }) => {
    const region = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    const image = document.createElement('img');
    image.src = icon;
    image.alt = '';
    link.append(image, label);
    region.append(link);
    regionList.append(region);
  });

  item.append(heading, description, regionList);
  footerList.append(item);
  await decorateRegionSelector(container, idPrefix);
}

function createLinkGroup(heading, idPrefix, columnIndex, groupIndex) {
  const group = document.createElement('section');
  group.className = 'footer-link-group';
  heading.before(group);

  const header = document.createElement('div');
  header.className = 'footer-link-group-header';
  const content = document.createElement('div');
  content.className = 'footer-link-group-content';

  const headingId = heading.id || `${idPrefix}-heading-${columnIndex}-${groupIndex}`;
  const contentId = `${idPrefix}-content-${columnIndex}-${groupIndex}`;
  heading.setAttribute('id', headingId);
  content.id = contentId;

  const button = document.createElement('button');
  button.className = 'footer-link-group-toggle';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', contentId);
  button.setAttribute('aria-labelledby', headingId);

  const indicator = document.createElement('span');
  indicator.setAttribute('aria-hidden', 'true');
  button.append(indicator);

  header.append(heading, button);
  group.append(header, content);
  return { button, content, group };
}

function getTableFooterRows(fragment) {
  const wrapper = fragment.querySelector('.footer-links, .group');
  if (!wrapper) return [];
  const table = wrapper.matches('table') ? wrapper : wrapper.querySelector('table');
  const rowContainer = table || wrapper;

  const rows = table
    ? [...table.querySelectorAll('tr')]
    : [...rowContainer.children].filter((row) => row.children.length);
  return rows.map((row) => {
    const cells = [...row.children].filter((cell) => (
      cell.matches('th, td') || (!table && cell.tagName === 'DIV')
    ));
    if (cells.length && cells.every((cell) => cell.matches('th'))) return null;
    if (cells.length < 3) {
      if (!row.textContent.trim()) return null;
      // eslint-disable-next-line no-console
      console.warn('Footer: link rows need Group, Link text, and Link cells.', row);
      return null;
    }

    const group = cells[0].textContent.trim();
    const linkText = cells[1].textContent.trim();
    const hasImageCell = cells.length >= 4;
    const media = hasImageCell
      ? cells[2].querySelector('picture, .icon, img')
      : null;
    const urlCell = cells[hasImageCell ? 3 : 2];
    const authoredLink = urlCell.querySelector('a[href]');
    const url = authoredLink?.getAttribute('href') || urlCell.textContent.trim();
    return {
      group,
      linkText,
      media,
      url,
      id: authoredLink?.id,
      adobeAnalytics: authoredLink?.getAttribute('adobe-analytics'),
    };
  }).filter((row) => row?.linkText);
}

function groupFooterRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.group.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { label: row.group, rows: [] });
    }
    groups.get(key)?.rows.push(row);
  });
  return [...groups.values()];
}

function buildDocumentFooter(fragment, idPrefix) {
  const content = document.createElement('div');
  content.className = 'footer-content';
  const responsiveGroups = [];
  const authoredColumns = [...fragment.querySelectorAll('.columns > div > div')];
  const columns = authoredColumns.length ? authoredColumns : [...fragment.children];
  columns.forEach((source, columnIndex) => {
    const column = document.createElement('div');
    column.className = 'footer-column';
    column.append(...source.childNodes);
    [...column.querySelectorAll(HEADING_SELECTOR)].filter((heading) => (
      !isRegionSelectorHeading(heading) && !heading.closest('li')
    )).forEach((heading, groupIndex) => {
      const nodes = getContentAfterHeading(heading);
      const group = createLinkGroup(heading, idPrefix, columnIndex, groupIndex);
      group.content.append(...nodes);
      responsiveGroups.push(group);
    });
    content.append(column);
  });
  content.lastElementChild?.classList.add('footer-copyright-column');
  return { content, responsiveGroups };
}

function createFooterLink(row) {
  const item = document.createElement('li');
  if (!row.url) {
    item.textContent = row.linkText;
    return item;
  }

  const link = document.createElement('a');
  link.href = row.url;
  if (row.id) link.id = row.id;
  if (row.adobeAnalytics) link.setAttribute('adobe-analytics', row.adobeAnalytics);
  link.append(row.linkText);
  if (row.media) link.append(row.media);
  item.append(link);
  return item;
}

function buildTableFooter(fragment, idPrefix) {
  const groupedRows = groupFooterRows(getTableFooterRows(fragment));
  if (!groupedRows.length) return null;

  const content = document.createElement('div');
  content.className = 'footer-content';
  const responsiveGroups = [];

  groupedRows.forEach(({ label, rows }, columnIndex) => {
    const column = document.createElement('div');
    column.className = 'footer-column';
    const list = document.createElement('ul');
    const copyright = [];

    rows.forEach((row) => {
      if (/^(copyright\b|©)/i.test(row.linkText)) {
        const paragraph = document.createElement('p');
        paragraph.textContent = row.linkText;
        copyright.push(paragraph);
      } else {
        list.append(createFooterLink(row));
      }
    });

    if (columnIndex < 3) {
      const heading = document.createElement('h3');
      heading.textContent = label;
      const group = createLinkGroup(heading, idPrefix, columnIndex, 0);
      if (list.children.length) group.content.append(list);
      column.append(group.group, ...copyright);
      responsiveGroups.push(group);
    } else {
      column.classList.add('footer-copyright-column');
      if (list.children.length) column.append(list);
      column.append(...copyright);
    }

    content.append(column);
  });

  return { content, responsiveGroups };
}

function setupResponsiveGroups(groups) {
  if (!groups.length) return;

  const mobile = window.matchMedia('(max-width: 900px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new WeakMap();
  const setExpanded = ({ button, content }, expanded, animate = false) => {
    button.setAttribute('aria-expanded', String(expanded));

    const currentAnimation = animations.get(content);
    const startHeight = content.hidden ? 0 : content.getBoundingClientRect().height;
    const startStyles = content.hidden ? null : window.getComputedStyle(content);
    const startMarginTop = startStyles?.marginTop || '0px';
    const startMarginBottom = startStyles?.marginBottom || '0px';
    currentAnimation?.cancel();

    if (!animate || reducedMotion.matches) {
      content.hidden = !expanded;
      content.style.removeProperty('overflow');
      animations.delete(content);
      return;
    }

    content.hidden = false;
    const expandedStyles = window.getComputedStyle(content);
    const animation = content.animate(
      [
        {
          height: `${startHeight}px`,
          marginTop: startMarginTop,
          marginBottom: startMarginBottom,
        },
        {
          height: expanded ? `${content.scrollHeight}px` : '0px',
          marginTop: expanded ? expandedStyles.marginTop : '0px',
          marginBottom: expanded ? expandedStyles.marginBottom : '0px',
        },
      ],
      {
        duration: 400,
        easing: 'ease-in-out',
      },
    );
    animations.set(content, animation);
    content.style.overflow = 'hidden';
    animation.finished.then(() => {
      if (animations.get(content) !== animation) return;
      content.hidden = !expanded;
      content.style.removeProperty('overflow');
      animations.delete(content);
    }).catch(() => {});
  };
  const syncGroups = () => {
    groups.forEach((group) => setExpanded(group, !mobile.matches));
  };

  groups.forEach((group) => {
    group.button.addEventListener('click', () => {
      if (!mobile.matches) return;
      setExpanded(group, group.button.getAttribute('aria-expanded') !== 'true', true);
    });
  });

  mobile.addEventListener('change', syncGroups);
  syncGroups();
}

function decorateCopyright(container) {
  const copyright = [...container.querySelectorAll('p')]
    .find((paragraph) => /^(copyright\b|©)/i.test(paragraph.textContent.trim()));
  copyright?.classList.add('footer-copyright');
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  let fragment;
  try {
    fragment = await loadFooterDocument(footerPath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Footer: failed to load authored content.', error);
    return;
  }
  if (!fragment) return;

  footerInstance += 1;
  const idPrefix = `footer-${footerInstance}`;
  const tableFooter = buildTableFooter(fragment, idPrefix)
    || buildDocumentFooter(fragment, idPrefix);

  block.replaceChildren(tableFooter.content);
  decorateLinks(tableFooter.content);
  decorateLinkIcons(tableFooter.content);
  decorateCopyright(tableFooter.content);
  await decorateHardcodedRegionSelector(tableFooter.content, idPrefix);
  setupResponsiveGroups(tableFooter.responsiveGroups);
  decorateShieldedSite(tableFooter.content);
}
