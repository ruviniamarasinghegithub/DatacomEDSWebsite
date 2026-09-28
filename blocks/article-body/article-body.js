function getVariant(block, name) {
  return block.classList.contains(`article-body-${name}`)
    || block.classList.contains(name);
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

  leftColumn.className = 'article-body-left-column';
  rightColumn.className = 'article-body-right-column';

  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    leftColumn.append(cells[0]);
    if (cells[1]) rightColumn.append(cells[1]);
  });

  block.replaceChildren(leftColumn, rightColumn);
  block.classList.add('article-body-ctn');
  decorateSidebar(rightColumn, block);
}
