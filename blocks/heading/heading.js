/* Datacom - Heading block - JS */

export default function decorate(block) {
  const rows = [...block.children];
  const fields = new Map();
  rows.forEach((row) => {
    const [label, value] = row.children;
    if (label && value) {
      const name = label.textContent.replace(/\s*\(.*\)\s*$/, '').trim()
        .replace(/:$/, '').trim()
        .toLowerCase();
      fields.set(name, value);
    }
  });
  const isFieldTable = fields.has('text');
  const contentRow = isFieldTable ? fields.get('text') : rows[0];
  const fieldValue = (name) => (isFieldTable ? fields.get(name)?.textContent.trim() || '' : '');

  const sizeMap = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const element = fieldValue('element').toLowerCase();
  const style = fieldValue('style').toLowerCase();
  const headingTag = (sizeMap.slice(0, 4).includes(element) ? element : null)
    || (sizeMap.includes(style) ? style : null)
    || sizeMap.find((tag) => block.classList.contains(tag)) || 'h2';
  const authoredAlignment = fieldValue('alignment').toLowerCase();
  const alignments = ['left', 'center', 'right'];
  const alignment = alignments.includes(authoredAlignment) ? authoredAlignment
    : alignments.find((value) => block.classList.contains(value)) || 'left';
  const theme = fieldValue('theme').toLowerCase().replace(/-theme$/, '');
  if (['white', 'light', 'dark'].includes(theme)) {
    block.classList.remove('white-theme', 'light-theme', 'dark-theme');
    block.classList.add(`${theme}-theme`);
  }

  // Optional extra rows: "id:", "linktitle:", "style:"
  let id = fieldValue('id');
  let linkTitle = fieldValue('linktitle');
  const authoredClass = fieldValue('class').toLowerCase();
  let visualStyle = sizeMap.slice(0, 4).includes(authoredClass) ? authoredClass : null;
  (isFieldTable ? [] : rows.slice(1)).forEach((row) => {
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
  const classes = ['heading-text', `${alignment}-aligned`];
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
