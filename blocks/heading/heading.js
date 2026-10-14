/* Datacom - Heading block - JS */

export default function decorate(block) {
  const rows = [...block.children];
  const contentRow = rows[0];

  const sizeMap = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const headingTag = sizeMap.find((tag) => block.classList.contains(tag)) || 'h2';
  const isCentered = block.classList.contains('center');

  // Optional extra rows: "id:", "linktitle:", "style:"
  let id = null;
  let linkTitle = null;
  let visualStyle = null;
  rows.slice(1).forEach((row) => {
    const rowText = row.textContent.trim();
    const lower = rowText.toLowerCase();
    if (lower.startsWith('id:')) {
      id = rowText.slice(3).trim();
    } else if (lower.startsWith('linktitle:')) {
      linkTitle = rowText.slice(10).trim();
    } else if (lower.startsWith('style:')) {
      const val = rowText.slice(6).trim().toLowerCase();
      if (sizeMap.includes(val)) visualStyle = val;
    }
  });

  const heading = document.createElement(headingTag);
  const classes = ['heading-text', isCentered ? 'center-aligned' : 'left-aligned'];
  if (visualStyle) classes.push(visualStyle);
  heading.className = classes.join(' ');
  if (id) heading.id = id;

  if (contentRow) {
    const content = contentRow.cloneNode(true);
    // Unwrap authoring cells and paragraphs without losing inline text or formatting.
    content.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6').forEach((wrapper) => {
      const separator = wrapper.nextSibling ? [document.createTextNode(' ')] : [];
      wrapper.replaceWith(...wrapper.childNodes, ...separator);
    });
    content.querySelectorAll('a.button').forEach((anchor) => {
      anchor.classList.remove('button', 'primary', 'secondary', 'accent');
    });
    const firstLink = content.querySelector('a');
    if (firstLink && linkTitle) firstLink.title = linkTitle;
    heading.append(...content.childNodes);
  }

  block.textContent = '';
  block.append(heading);
}
