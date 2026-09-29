/* ---- Datacom - Article Body Text block - JS ---- */

export default async function decorate(block) {
  const blockquotes = block.querySelectorAll('.article-body-text .cmp-text blockquote');
  const rows = [...block.children];
  const contentRows = [];

  rows.forEach((row) => {
    const rowText = row.textContent.trim();
    const firstCellText = row.querySelector('td, th, div, p')?.textContent.trim() || '';
    const rawIdentifierText = (firstCellText || rowText).trim();

    if (rawIdentifierText.toLowerCase().startsWith('id:')) {
      const id = rawIdentifierText.slice(3).trim();
      if (id) block.id = id;
      return;
    }

    contentRows.push(row);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'cmp-text';

  wrapper.append(...contentRows);
  block.textContent = '';
  block.appendChild(wrapper);
  block.classList.add('article-body-content-margin');

  blockquotes.forEach((blockquote) => {
    blockquote.classList.add('h3-text-format');

    if (window.innerWidth <= 1100) {
      blockquote.classList.add('h3-text-mobile-format');
    }
  });
}
