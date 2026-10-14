function normalizeFieldName(value) {
  return value.trim().replace(/\s*\((required|optional)\)\s*$/i, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFieldCell(block, fieldName) {
  const normalizedName = normalizeFieldName(fieldName);
  const row = [...block.children].find((candidate) => {
    const [label] = candidate.children;
    return label && normalizeFieldName(label.textContent) === normalizedName;
  });
  return row?.children[1] || null;
}

/**
 * Decorates a CTA button block.
 * @param {Element} block The CTA button block.
 */
export default function decorate(block) {
  const textCell = getFieldCell(block, 'Button text');
  const linkCell = getFieldCell(block, 'Link');
  const authoredLink = linkCell?.querySelector('a[href]');
  const href = authoredLink?.getAttribute('href') || linkCell?.textContent.trim();
  const buttonText = textCell?.textContent.trim();
  const optionsCell = getFieldCell(block, 'Options');
  const options = optionsCell?.textContent.trim().toLowerCase().split(/[,\s]+/).filter(Boolean)
    || [];
  const appearances = ['primary', 'secondary', 'tertiary'];
  const selectedOptions = options.length ? options : [
    ...appearances.filter((appearance) => block.classList.contains(appearance)),
    ...(block.classList.contains('dark-theme') ? ['dark-theme'] : []),
  ];
  const selectedAppearances = selectedOptions.filter((option) => appearances.includes(option));
  const errors = [];
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
  block.classList.remove(...appearances, 'dark-theme');
  block.classList.add(selectedAppearances[0] || 'primary');
  if (selectedOptions.includes('dark-theme')) block.classList.add('dark-theme');

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
