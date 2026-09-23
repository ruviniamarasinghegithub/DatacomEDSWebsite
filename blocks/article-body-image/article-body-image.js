/*
 * Article Body Image block
 * =========================================================================
 * Ported from the Datacom AEM "Article body image" component
 * (datacom-commons-v2 + datacom project overrides). The original component
 * supported up to 4 "assets", each of which could be an image, a video, or
 * a Lottie animation, plus per-asset border/lightbox/caption options and a
 * "blank container" state that halves asset 1 and hides asset 2.
 *
 * -------------------------------------------------------------------------
 * AUTHORING FORMAT
 * -------------------------------------------------------------------------
 * Each row of the block = one asset slot (1 to 4 rows supported).
 *
 * Row layout — 2 or 3 columns:
 *   Column 1 (required): the media itself —
 *     - an image, OR
 *     - a link to a video file (.mp4 / .webm / .mov), OR
 *     - a link to a Lottie JSON file (.json)
 *   Column 2 (optional): comma/space/newline separated option keywords —
 *     border      -> adds a border around the asset
 *     lightbox    -> clicking the asset opens it enlarged in a lightbox
 *     blank       -> (asset 2 only) halves asset 1's width and hides
 *                    asset 2 entirely — matches the legacy "blank container"
 *                    checkbox
 *     loop        -> (video/Lottie only) loops playback
 *     autoplay    -> (video/Lottie only) autoplays on load
 *     Any leftover text in this column that isn't one of the keywords
 *     above is treated as the caption for that asset.
 *   Column 3 (optional): if present, always treated as the caption text,
 *     regardless of column 2's contents. Use this if you need a caption
 *     that happens to contain one of the keywords above as a normal word.
 *
 * Block name variants (added in the block name row, e.g.
 * "Article Body Image (blank)"):
 *   None required — "blank" is normally set per-row (see above), but it
 *   can also be added here as a whole-block variant class for convenience;
 *   it has no effect unless there are exactly 2 asset rows.
 *
 * Video is always rendered autoplay + loop + muted + playsinline, matching
 * the legacy component's hardcoded behaviour, regardless of the loop /
 * autoplay keywords (those only affect Lottie).
 *
 * Lightbox implementation: this is a lightweight in-block modal (no
 * dependency on the old AEM "datacom-commons/components/content/lightbox"
 * component), since EDS blocks are self-contained.
 *
 * Lottie playback requires the lottie-web library, loaded on demand only
 * when a Lottie asset is present on the page (see loadLottie() below).
 * Update LOTTIE_CDN_URL to your project's preferred hosting location if
 * self-hosting is required instead of the public CDN.
 * -------------------------------------------------------------------------
 */

const LOTTIE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
const KEYWORDS = ['border', 'lightbox', 'blank', 'loop', 'autoplay'];

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
  const link = cell?.querySelector('a');
  const picture = cell?.querySelector('picture');
  if (picture) return { type: 'image', picture };
  if (link) {
    const href = link.getAttribute('href') || '';
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(href)) return { type: 'video', href };
    if (/\.json(\?.*)?$/i.test(href)) return { type: 'lottie', href };
  }
  return { type: 'none' };
}

function buildLightboxOverlay() {
  let overlay = document.querySelector('.article-body-image__lightbox-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'article-body-image__lightbox-overlay';
  overlay.innerHTML = '<button type="button" class="article-body-image__lightbox-close" aria-label="Close">&times;</button><div class="article-body-image__lightbox-content"></div>';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.article-body-image__lightbox-close')) {
      overlay.classList.remove('article-body-image__lightbox-overlay--open');
      overlay.querySelector('.article-body-image__lightbox-content').innerHTML = '';
    }
  });
  document.body.append(overlay);
  return overlay;
}

function openLightbox(mediaEl) {
  const overlay = buildLightboxOverlay();
  const content = overlay.querySelector('.article-body-image__lightbox-content');
  content.innerHTML = '';
  content.append(mediaEl.cloneNode(true));
  overlay.classList.add('article-body-image__lightbox-overlay--open');
}

async function buildAssetMedia(mediaInfo, altText) {
  if (mediaInfo.type === 'image') {
    const img = mediaInfo.picture.querySelector('img');
    if (img && altText) img.alt = altText;
    return mediaInfo.picture;
  }

  if (mediaInfo.type === 'video') {
    const video = document.createElement('video');
    video.className = 'article-body-image__video';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    if (altText) video.setAttribute('aria-label', altText);
    const source = document.createElement('source');
    source.src = mediaInfo.href;
    video.append(source);
    return video;
  }

  if (mediaInfo.type === 'lottie') {
    const container = document.createElement('div');
    container.className = 'article-body-image__lottie-container';
    const lottie = await loadLottie();
    lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: mediaInfo.loop === true,
      autoplay: mediaInfo.autoplay === true,
      path: mediaInfo.href,
    });
    return container;
  }

  return null;
}

export default function decorate(block) {
  const rows = [...block.children].slice(0, 4);
  const assetCount = rows.length;

  rows.forEach((row, index) => {
    const assetNum = index + 1;
    const cells = [...row.children];
    const mediaCell = cells[0];
    const optionsCell = cells[1];
    const captionCell = cells[2];

    const mediaInfo = getMediaType(mediaCell);
    const { flags, caption: parsedCaption } = parseOptionsCell(optionsCell);
    const caption = captionCell ? captionCell.textContent.trim() : parsedCaption;

    if (mediaInfo.type === 'lottie') {
      mediaInfo.loop = flags.has('loop');
      mediaInfo.autoplay = flags.has('autoplay');
    }

    const altText = mediaCell?.querySelector('img')?.alt || '';

    const wrapper = document.createElement('div');
    wrapper.className = 'article-body-image__image__ctn';

    const isBlank = assetNum === 2 && flags.has('blank');
    const isFullWidth = assetCount === 1 || (assetNum === 1 && isBlank);

    if (isFullWidth) wrapper.classList.add('article-body-image__image__ctn--full-width');
    if (isBlank && assetNum === 2) wrapper.classList.add('article-body-image__image__ctn--invisible');
    if (flags.has('lightbox')) wrapper.classList.add('article-body-image--lightbox');

    if (!isBlank || assetNum === 1) {
      buildAssetMedia(mediaInfo, altText).then((mediaEl) => {
        if (!mediaEl) return;
        if (mediaInfo.type === 'image' || mediaInfo.type === 'video') {
          if (flags.has('border')) {
            mediaEl.classList.add(
              mediaInfo.type === 'video' ? 'article-body-image__video--border' : 'article-body-image__image--border',
            );
          }
          mediaEl.classList.add(
            mediaInfo.type === 'video' ? 'article-body-image__video' : 'article-body-image__image',
          );
        }
        wrapper.append(mediaEl);

        if (flags.has('lightbox')) {
          wrapper.addEventListener('click', () => openLightbox(mediaEl));
          wrapper.setAttribute('role', 'button');
          wrapper.setAttribute('tabindex', '0');
          wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') openLightbox(mediaEl);
          });
        }
      });
    }

    if (caption && (assetNum === 1 || assetNum === 2)) {
      const captionEl = document.createElement('span');
      captionEl.className = 'article-body-image__caption';
      captionEl.textContent = caption;
      wrapper.append(captionEl);
    }

    row.replaceWith(wrapper);
  });

  // Wrap all asset containers in the flex row, matching the original markup.
  const ctn = document.createElement('div');
  ctn.className = 'article-body-image__ctn';
  [...block.children].forEach((child) => ctn.append(child));
  block.append(ctn);
  block.classList.add('article-body-image__parent-ctn');
}