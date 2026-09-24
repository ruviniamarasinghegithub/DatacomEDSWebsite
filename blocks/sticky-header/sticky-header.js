export default function decorate(block) {
  const rows = [...block.children];
  const firstRow = rows[0];
  const cells = firstRow ? [...firstRow.children] : [];
  const headingCell = cells[0];
  const buttonCell = cells[1];

  let headingText = headingCell?.textContent.trim()
    || document.querySelector('main h1')?.textContent.trim()
    || '';

  let link = buttonCell?.querySelector('a');

  if (!link && rows.length > 1) {
    const parsed = rows.reduce((result, row) => {
      const text = row.textContent.trim();
      const match = text.match(/^\s*(heading|button)\s*:\s*(.*)$/i);
      if (!match) return result;

      const [, type, value] = match;
      const cleanedValue = value.trim();
      const lowerType = type.toLowerCase();

      if (lowerType === 'heading') {
        return { ...result, headingText: cleanedValue || result.headingText };
      }

      if (lowerType === 'button') {
        const buttonLink = row.querySelector('a');
        if (buttonLink) {
          return { ...result, link: buttonLink };
        }

        return {
          ...result,
          link: {
            href: '#',
            textContent: cleanedValue || 'Read more',
          },
        };
      }

      return result;
    }, { headingText, link: null });

    headingText = parsed.headingText;
    link = parsed.link || link;
  }

  block.textContent = '';
  block.classList.add('sticky-header');

  const stickyBar = document.createElement('div');
  stickyBar.className = 'sticky-header-bar';

  const headerContent = document.createElement('div');
  headerContent.className = 'sticky-header-content';

  if (headingText) {
    const heading = document.createElement('div');
    heading.className = 'sticky-header-heading';
    heading.textContent = headingText;
    headerContent.append(heading);
  }

  if (link) {
    const buttonWrap = document.createElement('div');
    buttonWrap.className = 'sticky-header-button-wrap';
    const button = document.createElement('a');
    button.className = 'sticky-header-button';
    button.href = link.href || '#';
    button.textContent = link.textContent?.trim() || 'Read more';
    buttonWrap.append(button);
    headerContent.append(buttonWrap);
  }

  stickyBar.append(headerContent);
  block.append(stickyBar);

  const updateStickyState = () => {
    const topBoundary = block.offsetTop;
    const shouldStick = window.scrollY > topBoundary;
    block.classList.toggle('is-sticky', shouldStick);
  };

  updateStickyState();
  window.addEventListener('scroll', updateStickyState, { passive: true });
  window.addEventListener('resize', updateStickyState, { passive: true });
}
