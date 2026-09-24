/*
 * Sticky Header block
 * =========================================================================
 * Ported from the Datacom "Sticky header" component (extends AEM core
 * Tabs v1) — datacom-commons-v2 + datacom project overrides.
 *
 * SCOPE FOR THIS PASS (explicitly excluded, do not extend without asking):
 *   - Anchors, Modal, Tabs, and Experience fragment "Tabs type" modes
 *   - The anchor scroll-progress bar and anchor dropdown/arrows
 *   - The scroll-driven JS that hides/shows the mega nav header and
 *     animates the bar's `top` offset as the user scrolls up/down
 *     (sticky-header.js in both the commons and project LESS/JS pairs)
 *   - Hash-based auto-scroll-to-tab-on-load behaviour
 *
 * What IS implemented: heading (custom or page <h1> fallback) + a single
 * CTA "Button" mode link, with sticky positioning done via plain CSS
 * (position: sticky) rather than the original's scroll-listener approach.
 *
 * Class names below intentionally match the original component's naming
 * (cmp-tabs__tablist-fixed-ctn, cmp-tabs__heading, etc.) rather than
 * inventing new ones, so that Anchors/Tabs/Modal support can be added
 * later, re-using the existing CSS selectors from the LESS files instead
 * of a rename.
 *
 * -------------------------------------------------------------------------
 * AUTHORING FORMAT
 * -------------------------------------------------------------------------
 * Single row, 1 or 2 columns:
 *   Column 1 (optional): heading text. Leave empty to fall back to the
 *     page's own <h1> text automatically.
 *   Column 2 (optional): a link — becomes the CTA button, right-aligned.
 *
 * Block name variants (e.g. "Sticky Header (hide-heading, no-sticky)"):
 *   hide-heading -> hides the heading entirely, even if page has an <h1>
 *   no-sticky    -> renders as a normal (non-sticky) header bar
 * -------------------------------------------------------------------------
 */

export default function decorate(block) {
  const hideHeading = block.classList.contains('hide-heading');
  const noSticky = block.classList.contains('no-sticky');
  block.classList.remove('hide-heading', 'no-sticky');

  const row = block.firstElementChild;
  const cells = row ? [...row.children] : [];
  const headingCell = cells[0];
  const buttonCell = cells[1];

  const headingText = headingCell?.textContent.trim()
    || document.querySelector('main h1')?.textContent.trim()
    || '';

  const link = buttonCell?.querySelector('a');

  block.textContent = '';

  const fixedCtn = document.createElement('div');
  fixedCtn.className = 'sticky-header-bar';
  if (hideHeading) fixedCtn.classList.add('sticky-header-bar-no-heading');

  const tablistCtn = document.createElement('div');
  tablistCtn.className = 'sticky-header-tablist-ctn';

  if (!hideHeading && headingText) {
    const headingCtn = document.createElement('div');
    headingCtn.className = 'sticky-header-heading-ctn';
    const heading = document.createElement('div');
    heading.className = 'sticky-header-heading';
    heading.textContent = headingText;
    headingCtn.append(heading);
    tablistCtn.append(headingCtn);
  }

  if (link) {
    const btnCtn = document.createElement('div');
    btnCtn.className = 'sticky-header-btn';
    const button = document.createElement('a');
    button.className = 'sticky-header-button cmp-cta-button';
    button.href = link.href;
    button.textContent = link.textContent.trim();
    btnCtn.append(button);
    tablistCtn.append(btnCtn);
  }

  fixedCtn.append(tablistCtn);
  block.append(fixedCtn);

  if (noSticky) block.classList.add('sticky-header-static');
}
