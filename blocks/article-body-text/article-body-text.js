/*
 * Body Text block
 * -----------------------------------------------------------------------
 * Ported from the Datacom AEM "Article body text" (datacom-commons-v2) and
 * "Body text" (datacom) core Text v2 components.
 *
 * The original component was a plain rich-text field (paragraphs, headings,
 * links, blockquotes) wrapped in a single <div class="cmp-text"> — there was
 * no custom JS behaviour, only CSS for links, headings and two style
 * variants (padding-bottom, padding-bottom-form).
 *
 * Authoring in the document: put the rich text directly in the block's
 * single cell. Variants are added as extra words in the block name, e.g.
 *   "Body Text (padding-bottom)"
 *   "Body Text (padding-bottom-form)"
 * EDS automatically lowercases these and adds them as classes on the block,
 * so no JS is needed to read them — only the CSS below needs to match.
 *
 * The "dark-blue" style from the original component was applied to inline
 * spans of text inside the rich text (not a block-level variant). To keep
 * that working, wrap the relevant text in the doc with a span/text styled
 * as "dark-blue" (e.g. via a text color option in the rich text toolbar
 * that outputs <span class="dark-blue">), and the CSS below will style it.
 */

export default function decorate(block) {

  block.classList.add('cmp-text');

  // EDS wraps authored content as one <div> (row) containing one <div>
  // (cell) per block. Flatten that structure so headings/paragraphs sit
  // directly under .article-body-text.cmp-text, same as the legacy component output.
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      [...cell.childNodes].forEach((node) => block.appendChild(node));
    });
    row.remove();
  });
}