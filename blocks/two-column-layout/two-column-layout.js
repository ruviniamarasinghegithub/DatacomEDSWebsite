import { decorateBlock, loadBlock, toClassName } from '../../scripts/aem.js';

function convertTable(table) {
  const rows = [...table.rows].filter((row) => row.closest('table') === table);
  const header = rows.shift();
  const name = header?.textContent.trim() || '';
  const [, blockName, variants = ''] = name.match(/^([^()]+)(?:\(([^)]+)\))?$/) || [];
  if (!blockName || !toClassName(blockName)) {
    throw new Error('Two column layout: nested block tables must have a block name in the first row.');
  }

  const block = document.createElement('div');
  block.classList.add(toClassName(blockName));
  variants.split(',').map((variant) => toClassName(variant)).filter(Boolean)
    .forEach((variant) => block.classList.add(variant));
  rows.forEach((row) => {
    const blockRow = document.createElement('div');
    [...row.cells].forEach((cell) => {
      const blockCell = document.createElement('div');
      blockCell.append(...cell.childNodes);
      blockRow.append(blockCell);
    });
    block.append(blockRow);
  });
  table.replaceWith(block);
  return block;
}

export default async function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row) => {
    row.classList.add('two-column-layout-row');
    [...row.children].forEach((column) => {
      column.classList.add('two-column-layout-column');
    });
  });

  const columns = rows.flatMap((row) => [...row.children]);
  const nestedBlocks = [];
  columns.forEach((column) => {
    // The shared block decorator wraps cells starting with a nested div in a paragraph.
    column.querySelectorAll(':scope > p').forEach((paragraph) => {
      if (paragraph.querySelector(':scope > div[class]')) {
        paragraph.replaceWith(...paragraph.childNodes);
      }
    });
    [...column.children].forEach((child) => {
      let nestedBlock;
      if (child.tagName === 'TABLE') {
        nestedBlock = convertTable(child);
      } else if (child.tagName === 'DIV' && child.classList.length) {
        nestedBlock = child;
      }
      if (nestedBlock) {
        const wrapper = document.createElement('div');
        nestedBlock.before(wrapper);
        wrapper.append(nestedBlock);
        if (!nestedBlock.dataset.blockName) decorateBlock(nestedBlock);
        nestedBlocks.push(nestedBlock);
      }
    });
  });
  for (let index = 0; index < nestedBlocks.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadBlock(nestedBlocks[index]);
  }
}
