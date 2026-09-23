/* ---- Datacom - Article Body Text block - JS ---- */

export default async function decorate(block) {
    const bodyText = block.querySelector('.article-body-text');
    const blockquotes = block.querySelectorAll('.article-body-text .cmp-text blockquote');

    if (bodyText) {
        bodyText.classList.add('article-body-content-margin');
    }

    blockquotes.forEach((blockquote) => {
        blockquote.classList.add('h3-text-format');

        if (window.innerWidth <= 1100) {
            blockquote.classList.add('h3-text-mobile-format');
        }
    });
}