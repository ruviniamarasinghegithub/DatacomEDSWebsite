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

/**
 * Decorates a CTA button block.
 * @param {Element} block The CTA button block.
 */
export default function decorate(block) {
  const textCell = getFieldCell(block, 'Button text');
  const linkCell = getFieldCell(block, 'Button Link') || getFieldCell(block, 'Link');
  const authoredLink = linkCell?.querySelector('a[href]');
  const href = authoredLink?.getAttribute('href') || linkCell?.textContent.trim();
  const buttonText = textCell?.textContent.trim();
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
  const themeValue = themeCell?.textContent.trim().toLowerCase();
  const inheritedTheme = !selectedOptions.length && !themeValue ? getParentTheme(block) : null;
  const theme = themeValue
    || inheritedTheme
    || (!themeCell && selectedOptions.includes('dark-theme') ? 'dark' : 'white');
  const errors = [];
  if (!['white', 'light', 'dark', 'white-theme', 'light-theme', 'dark-theme'].includes(theme)) {
    errors.push('Button Theme must be white, light, or dark.');
  }
  if (!buttonText) errors.push('Button text is required.');
  if (buttonText && buttonText.length > 40) errors.push('Button text must be at most 40 characters.');
  if (!href) errors.push('Link is required.');
  if (href) {
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
  block.classList.add(theme.endsWith('-theme') ? theme : `${theme}-theme`);

  const link = authoredLink || document.createElement('a');
  link.className = 'cta-button-link';
  link.setAttribute('href', href);
  if (link.target === '_blank') link.setAttribute('rel', 'noopener noreferrer');

  const text = document.createElement('span');
  text.className = 'cta-button-text';
  text.textContent = buttonText;
  link.replaceChildren(text);
  block.replaceChildren(link);
}
