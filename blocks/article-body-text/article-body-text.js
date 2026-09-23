/* ---- Datacom - Article Body Text block - JS ---- */

export default async function decorate(block) {
    const blockquotes = block.querySelectorAll('.article-body-text .cmp-text blockquote');
    const wrapper = document.createElement('div');
    wrapper.className = 'cmp-text';

    while (block.firstChild) {
        wrapper.appendChild(block.firstChild);
    }

    block.appendChild(wrapper);
    block.classList.add('article-body-content-margin');

    blockquotes.forEach((blockquote) => {
        blockquote.classList.add('h3-text-format');

        if (window.innerWidth <= 1100) {
            blockquote.classList.add('h3-text-mobile-format');
        }
    });
}
