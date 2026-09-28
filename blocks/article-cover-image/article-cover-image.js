const LOTTIE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';

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

function parseField(row) {
  const cell = row.firstElementChild;
  const text = (cell?.textContent || '').trim();
  const separator = text.indexOf(':');
  if (separator < 0) return null;

  const label = text.slice(0, separator).trim().toLowerCase();
  const value = text.slice(separator + 1).trim();
  if (!label) return null;

  return { label, value, href: cell.querySelector('a[href]')?.href || '' };
}

function toBoolean(value) {
  return value.trim().toLowerCase() === 'true';
}

function getDamCaption(picture) {
  const image = picture?.querySelector('img');
  return image?.getAttribute('title')
    || image?.dataset.title
    || picture?.querySelector('a[title]')?.getAttribute('title')
    || '';
}

export default async function decorate(block) {
  const fields = {};
  let picture;

  [...block.children].forEach((row) => {
    const rowPicture = row.querySelector('picture');
    if (rowPicture) {
      picture = rowPicture;
      return;
    }

    const field = parseField(row);
    if (field) fields[field.label] = field;
  });

  const getValue = (...labels) => {
    const field = labels.map((label) => fields[label]).find(Boolean);
    return field?.value || '';
  };
  const lottieEnabled = toBoolean(getValue('switch to lottie asset'));
  const lottieField = fields['lottie asset'];
  const lottiePath = lottieField?.href || lottieField?.value || '';
  const useLottie = lottieEnabled && /\.json(?:[?#].*)?$/i.test(lottiePath);
  const id = getValue('id').trim().replace(/\s+/g, '-');
  const decorative = toBoolean(getValue('image is decorative'));
  const authoredCaption = getValue('caption');
  const useDamCaption = toBoolean(getValue('get caption from dam'));
  const caption = (useDamCaption && getDamCaption(picture)) || authoredCaption;
  const popupCaption = toBoolean(getValue('display caption as pop-up'));
  const loop = toBoolean(getValue('loop animation'));
  const autoplay = toBoolean(getValue('enable auto play'));

  block.textContent = '';
  if (id) block.id = id;

  const figure = document.createElement('figure');
  figure.className = 'article-cover-image-figure';

  if (useLottie) {
    const container = document.createElement('div');
    container.className = 'lottie-asset';
    if (decorative) container.setAttribute('aria-hidden', 'true');
    figure.append(container);
    block.append(figure);

    try {
      const lottie = await loadLottie();
      lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop,
        autoplay,
        path: lottiePath,
      });
    } catch (error) {
      container.remove();
    }
  } else if (picture) {
    const image = picture.querySelector('img');
    if (image) {
      image.classList.add('article-cover-image-image');
      if (decorative) image.alt = '';
    }
    figure.append(picture);
  }

  if (caption) {
    const captionEl = document.createElement('figcaption');
    captionEl.className = 'article-cover-image-caption';
    captionEl.textContent = caption;

    if (popupCaption) {
      const captionButton = document.createElement('button');
      captionButton.className = 'article-cover-image-caption-button';
      captionButton.type = 'button';
      captionButton.textContent = 'Caption';
      captionButton.setAttribute('aria-expanded', 'false');
      captionEl.id = `${block.id || 'article-cover-image'}-caption`;
      captionEl.hidden = true;
      captionButton.setAttribute('aria-controls', captionEl.id);
      captionButton.addEventListener('click', () => {
        const expanded = captionButton.getAttribute('aria-expanded') === 'true';
        captionButton.setAttribute('aria-expanded', String(!expanded));
        captionEl.hidden = expanded;
      });
      figure.append(captionButton);
    }

    figure.append(captionEl);
  }

  if (figure.children.length) block.append(figure);
}
