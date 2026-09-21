export default function decorate(block) {
  const rows = [...block.children];
  const [imageRow, subHeadingRow, mainHeadingRow, subTextRow, cta1Row, cta2Row] = rows;

  const isContained = block.classList.contains('contained');
  const isGradient = block.classList.contains('gradient');
  // 'arched' handled via CSS class already present on block; 'square' needs no extra class

  const picture = imageRow?.querySelector('picture');
  const videoLink = imageRow?.querySelector('a[href$=".mp4"], a[href$=".mov"]');
  const youtubeLink = imageRow?.querySelector('a[href*="youtube.com/watch"], a[href*="youtu.be/"]');

  let mediaWrapper;
  if (videoLink) {
    mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'hero-cover__video-ctn';
    const video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    const source = document.createElement('source');
    source.src = videoLink.href;
    video.append(source);
    video.className = 'hero-cover__video';
    mediaWrapper.append(video);
  } else if (youtubeLink) {
    const url = new URL(youtubeLink.href);
    const videoId = url.searchParams.get('v') || url.pathname.split('/').pop();
    mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'hero-cover__video-ctn';
    const iframe = document.createElement('iframe');
    iframe.className = 'hero-cover__video';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('frameborder', '0');
    mediaWrapper.append(iframe);
    } else if (picture) {
    mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'hero-cover__image-ctn';
    picture.querySelector('img')?.classList.add('hero-cover__image');
    mediaWrapper.append(picture);
    const overlay = document.createElement('div');
    overlay.className = `hero-cover__color-overlay hero-cover__color-overlay--${isGradient && !isContained ? 'enabled' : 'disabled'}`;
    mediaWrapper.append(overlay);
  }

  const textCtn = document.createElement('div');
  textCtn.className = 'hero-cover__text-ctn';

  const animatedEls = [];

  const subHeadingText = subHeadingRow?.textContent.trim();
  if (subHeadingText) {
    const h4 = document.createElement('h4');
    h4.className = 'hero-cover__text hero-cover__text--sub-heading hero-cover__animate';
    h4.textContent = subHeadingText;
    textCtn.append(h4);
    animatedEls.push(h4);
  }

  if (mainHeadingRow?.textContent.trim()) {
    const h1 = document.createElement('h1');
    h1.className = 'hero-cover__text hero-cover__text--main-heading hero-cover__animate';
    h1.innerHTML = mainHeadingRow.innerHTML;
    textCtn.append(h1);
    animatedEls.push(h1);
  }

  const subTextContent = subTextRow?.textContent.trim();
  if (subTextContent) {
    const p = document.createElement('p');
    p.className = 'hero-cover__text hero-cover__text--description hero-cover__animate';
    p.textContent = subTextContent;
    textCtn.append(p);
    animatedEls.push(p);
  }

  const btnCtn = document.createElement('div');
  btnCtn.className = 'hero-cover__btn-ctn hero-cover__animate';
  [cta1Row, cta2Row].forEach((row) => {
    const link = row?.querySelector('a');
    if (link) {
      link.className = 'hero-cover__btn-link';
      const wrapper = document.createElement('div');
      wrapper.className = 'hero-cover__btn-wrapper';
      const btn = document.createElement('div');
      btn.className = 'hero-cover__btn';
      btn.append(link);
      wrapper.append(btn);
      btnCtn.append(wrapper);
    }
  });
  if (btnCtn.children.length) {
    textCtn.append(btnCtn);
    animatedEls.push(btnCtn);
  }

  const contentCtn = document.createElement('div');
  contentCtn.className = `hero-cover__content-ctn${isContained && !isGradient ? ' hero-cover__content-ctn--contained' : ''}`;
  contentCtn.append(textCtn);

  const floatingCtn = document.createElement('div');
  floatingCtn.className = 'hero-cover__floating-ctn';
  floatingCtn.append(contentCtn);

  const scrollBtnCtn = document.createElement('div');
  scrollBtnCtn.className = 'hero-cover__scroll-button-ctn';
  const scrollBtn = document.createElement('button');
  scrollBtn.type = 'button';
  scrollBtn.className = 'hero-cover__scroll-button';
  scrollBtn.setAttribute('aria-label', 'Scroll to next section');
  scrollBtn.textContent = '↓';
  scrollBtn.addEventListener('click', () => {
    block.closest('.section')?.nextElementSibling?.scrollIntoView({ behavior: 'smooth' });
  });
  scrollBtnCtn.append(scrollBtn);

  block.textContent = '';
  if (mediaWrapper) block.append(mediaWrapper);
  block.append(floatingCtn, scrollBtnCtn);

  // Stagger animation delays
  animatedEls.forEach((el, i) => {
    el.style.setProperty('--hero-cover-delay', `${0.3 + i * 0.15}s`);
  });

  // Play animation once in view, and fade in the image once loaded
  const img = picture?.querySelector('img');
  const playAnimation = () => {
    block.classList.add('hero-cover--in-view');
    if (img) img.classList.add('fade-in');
  };

  if (img && !img.complete) {
    img.addEventListener('load', playAnimation, { once: true });
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        playAnimation();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(block);
  }
}