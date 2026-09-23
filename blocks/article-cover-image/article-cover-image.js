/*
 * Article Cover Image block
 * =========================================================================
 * Ported from the Datacom AEM "Article cover image" component
 * (datacom-commons-v2 / datacom, extending core/wcm/components/image/v2).
 *
 * The original component rendered a single full-bleed hero image (or, if
 * configured, a Lottie animation instead) capped at 500px tall with
 * object-fit: cover, plus an optional caption shown centered underneath,
 * constrained to the normal content column width.
 *
 * -------------------------------------------------------------------------
 * AUTHORING FORMAT
 * -------------------------------------------------------------------------
 * Single row, 1 to 3 columns:
 *   Column 1 (required): the media —
 *     - an image, OR
 *     - a link to a Lottie JSON file (.json)
 *   Column 2 (optional): comma/space/newline separated option keywords —
 *     loop        -> (Lottie only) loops playback
 *     autoplay    -> (Lottie only) autoplays on load
 *     Any leftover text in this column that isn't one of the keywords
 *     above is treated as the caption.
 *   Column 3 (optional): if present, always treated as the caption text,
 *     regardless of column 2's contents.
 *
 * This block is always rendered full-bleed (edge-to-edge across the
 * viewport), matching the reference page's hero image behaviour — no
 * variant keyword is needed to trigger this, it's the block's default.
 * -------------------------------------------------------------------------
 */

const LOTTIE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
const KEYWORDS = ['loop', 'autoplay'];

let lottiePromise;
function loadLottie() {
  if (!lottiePromise) {
    lottiePromise = new Promise((resolve, reject) => {
      if (window.lottie) {
        resolve(window.lottie);
        return;
      }
      const script = document.createElement('script');
      script.src = LOTTIE_CDN_URL;
      script.onload = () => resolve(window.lottie);
      script.onerror = reject;
      document.head.append(script);
    });
  }
  return lottiePromise;
}

function parseOptionsCell(cell) {
  const text = (cell?.textContent || '').trim();
  const found = new Set();
  const remainder = text
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => {
      const lower = part.toLowerCase();
      if (KEYWORDS.includes(lower)) {
        found.add(lower);
        return false;
      }
      return part.length > 0;
    })
    .join(' ');
  return { flags: found, caption: remainder };
}

function getMediaType(cell) {
  const picture = cell?.querySelector('picture');
  const link = cell?.querySelector('a');
  if (picture) return { type: 'image', picture };
  if (link) {
    const href = link.getAttribute('href') || '';
    if (/\.json(\?.*)?$/i.test(href)) return { type: 'lottie', href };
  }
  return { type: 'none' };
}

export default async function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const cells = [...row.children];
  const mediaCell = cells[0];
  const optionsCell = cells[1];
  const captionCell = cells[2];

  const mediaInfo = getMediaType(mediaCell);
  const { flags, caption: parsedCaption } = parseOptionsCell(optionsCell);
  const caption = captionCell ? captionCell.textContent.trim() : parsedCaption;

  block.textContent = '';

  if (mediaInfo.type === 'image') {
    const img = mediaInfo.picture.querySelector('img');
    if (img) img.classList.add('cmp-image__image');
    block.append(mediaInfo.picture);
  } else if (mediaInfo.type === 'lottie') {
    const container = document.createElement('div');
    container.className = 'lottie-asset';
    block.append(container);
    const lottie = await loadLottie();
    lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: flags.has('loop'),
      autoplay: flags.has('autoplay'),
      path: mediaInfo.href,
    });
  }

  if (caption) {
    const captionEl = document.createElement('span');
    captionEl.className = 'cmp-image__title';
    captionEl.textContent = caption;
    block.append(captionEl);
  }
}
