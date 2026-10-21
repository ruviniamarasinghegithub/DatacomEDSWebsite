import {
  normalizeModalPath,
  openMarketoModalFromPath,
} from '../../scripts/marketo-modal-from-path.js';

function normalizeFieldName(value) {
  return value.trim()
    .replace(/\s*\*+\s*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getFieldCell(block, fieldName) {
  const normalizedName = normalizeFieldName(fieldName);
  const row = [...block.children].find((candidate) => {
    const [label] = candidate.children;
    return label && normalizeFieldName(label.textContent) === normalizedName;
  });
  return row?.children[1] || null;
}

function getParentTheme(block) {
  const parent = block.parentElement?.closest('.full-width-banner, .text-with-image');
  if (!parent) return null;

  let container = parent;
  while (container) {
    const classNames = [...container.classList];
    const theme = ['white', 'light', 'dark'].find((value) => (
      classNames.some((name) => name === `${value}-theme`
        || name === `text-with-image-${value}-theme`
        || name.startsWith(`${value}-theme--`))
    ));
    if (theme) return theme;
    container = container.parentElement;
  }
  return null;
}

function resolveAction(raw) {
  const value = (raw || '').trim().toLowerCase().replace(/[_-\s]+/g, '');
  if (!value) return null;
  // Authors: "redirect" | "MarketoModalFragment" (legacy: open in modal)
  if (value === 'marketomodalfragment' || value.includes('modal')) return 'modal';
  if (value === 'redirect' || value === 'link' || value === 'navigate') return 'redirect';
  return null;
}

/** Blank / placeholder values authors use instead of a real URL */
function isPlaceholderHref(value) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return ['', '#', '/', 'n/a', 'na', 'none', '-', 'nil', 'null', 'javascript:void(0)']
    .includes(normalized);
}

function cellRawValue(cell) {
  if (!cell) return '';
  const authoredLink = cell.querySelector('a[href]');
  return (authoredLink?.getAttribute('href') || cell.textContent || '').trim();
}

function resolveModalPath(cell) {
  const raw = cellRawValue(cell);
  if (isPlaceholderHref(raw)) return '';
  return normalizeModalPath(raw);
}

function cellHref(cell) {
  const raw = cellRawValue(cell);
  if (isPlaceholderHref(raw)) return '';
  return raw;
}

/**
 * Decorates a CTA button block.
 * @param {Element} block The CTA button block.
 */
export default function decorate(block) {
  const textCell = getFieldCell(block, 'Button text');
  const linkCell = getFieldCell(block, 'Button Link') || getFieldCell(block, 'Link');
  const authoredLink = linkCell?.querySelector('a[href]');
  const href = cellHref(linkCell);
  const buttonText = textCell?.textContent.trim();
  const actionCell = getFieldCell(block, 'Button action') || getFieldCell(block, 'Action');
  let modalPath = resolveModalPath(
    getFieldCell(block, 'Modal page path')
      || getFieldCell(block, 'Modal path')
      || getFieldCell(block, 'Page path'),
  );
  const actionFromField = resolveAction(actionCell?.textContent);
  // Only use Button Link as modal path when it looks like a real page path (not N/A)
  if (!modalPath && actionFromField === 'modal' && href?.startsWith('/')) {
    modalPath = normalizeModalPath(href);
  }
  const action = actionFromField || (modalPath ? 'modal' : 'redirect');

  const optionsCell = getFieldCell(block, 'Button style')
    || getFieldCell(block, 'Type of the button') || getFieldCell(block, 'Options');
  const options = optionsCell?.textContent.trim().toLowerCase().split(/[,\s]+/).filter(Boolean)
    || [];
  const appearances = ['primary', 'secondary', 'tertiary'];
  const selectedOptions = optionsCell ? options : [
    ...appearances.filter((appearance) => block.classList.contains(appearance)),
    ...(block.classList.contains('dark-theme') ? ['dark-theme'] : []),
  ];
  const selectedAppearances = selectedOptions.filter((option) => appearances.includes(option));
  const themeCell = getFieldCell(block, 'Button Theme');
  const themeValue = themeCell?.textContent.trim().toLowerCase().replace(/-theme$/, '');
  const inheritedTheme = !selectedOptions.length && !themeValue ? getParentTheme(block) : null;
  let theme = themeValue
    || inheritedTheme
    || (!themeCell && selectedOptions.includes('dark-theme') ? 'dark' : 'white');
  if (!['white', 'light', 'dark'].includes(theme)) theme = 'white';

  // MarketoModalFragment: Button Link may be N/A / blank — only text + modal path matter
  if (action === 'modal') {
    if (!buttonText) {
      // eslint-disable-next-line no-console
      console.error('CTA Button: Button text is required for MarketoModalFragment.', block);
      block.replaceChildren();
      return;
    }
    if (!modalPath) {
      // eslint-disable-next-line no-console
      console.error('CTA Button: Modal page path is required for MarketoModalFragment.', block);
      block.replaceChildren();
      return;
    }

    block.classList.remove(...appearances, 'white-theme', 'dark-theme', 'light-theme');
    block.classList.add(selectedAppearances[0] || 'primary');
    block.classList.add(`${theme}-theme`);

    const text = document.createElement('span');
    text.className = 'cta-button-text';
    text.textContent = buttonText;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cta-button-link';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.replaceChildren(text);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openMarketoModalFromPath(modalPath, { trigger: button });
    });
    block.replaceChildren(button);
    return;
  }

  const errors = [];
  if (!buttonText) errors.push('Button text is required.');
  if (buttonText && buttonText.length > 40) errors.push('Button text must be at most 40 characters.');
  if (!href) {
    errors.push('Link is required when Button action is redirect (use MarketoModalFragment with Modal page path to open a form).');
  } else {
    try {
      const url = new URL(href, window.location.href);
      if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
        errors.push('Link must use HTTP, HTTPS, mailto, or tel.');
      }
    } catch {
      errors.push('Link must be a valid URL or page path.');
    }
  }
  if (selectedOptions.length > 2 || selectedAppearances.length > 1
    || selectedOptions.some((option) => ![...appearances, 'dark-theme'].includes(option))) {
    errors.push('Options must contain one appearance and optionally dark-theme.');
  }

  if (errors.length) {
    // eslint-disable-next-line no-console
    console.error(`CTA Button: ${errors.join(' ')}`, block);
    block.replaceChildren();
    return;
  }

  block.classList.remove(...appearances, 'white-theme', 'dark-theme', 'light-theme');
  block.classList.add(selectedAppearances[0] || 'primary');
  block.classList.add(`${theme}-theme`);

  const text = document.createElement('span');
  text.className = 'cta-button-text';
  text.textContent = buttonText;

  const link = authoredLink || document.createElement('a');
  link.className = 'cta-button-link';
  link.setAttribute('href', href);
  if (link.target === '_blank') link.setAttribute('rel', 'noopener noreferrer');
  link.replaceChildren(text);
  block.replaceChildren(link);
}
