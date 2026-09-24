function getRowLabel(row) {
  const cells = [...row.children];
  const text = cells[0]?.textContent.trim() || '';
  const separator = text.indexOf(':');
  return (cells.length > 1 ? text : text.slice(0, separator))
    .replace(/:$/, '').trim().toLowerCase();
}

function getFieldRows(block) {
  return [...block.children].reduce((fields, row) => {
    const cells = [...row.children];
    if (row.querySelector('picture')) return fields;
    const text = cells[0]?.textContent.trim() || '';
    const separator = text.indexOf(':');
    const label = getRowLabel(row);
    const value = cells.length > 1 ? cells[1] : text.slice(separator + 1).trim();
    if (label && value) fields[label] = value;
    return fields;
  }, {});
}

function fieldValue(fields, name) {
  return typeof fields[name] === 'string' ? fields[name] : fields[name]?.textContent.trim() || '';
}

function isTrue(value) {
  return value.toLowerCase() === 'true';
}

function getFieldLink(rows, name) {
  const row = rows.find((item) => getRowLabel(item) === name);
  return row?.querySelector('a[href]');
}

function getMediaUrl(rows, fields, name) {
  return getFieldLink(rows, name)?.href || fieldValue(fields, name);
}

function createVideoMedia(url, alt) {
  if (!url) return null;
  const media = document.createElement('div');
  media.className = 'text-with-image-video';

  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
    const video = document.createElement('video');
    video.className = 'text-with-image-video-player';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (alt) video.setAttribute('aria-label', alt);
    const source = document.createElement('source');
    source.src = url;
    video.append(source);
    media.append(video);
    return media;
  }

  let embedUrl;
  try {
    const parsedUrl = new URL(url, window.location.href);
    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.searchParams.get('v') || parsedUrl.pathname.split('/').filter(Boolean).pop();
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (parsedUrl.hostname.includes('vimeo.com')) {
      const videoId = parsedUrl.pathname.split('/').filter(Boolean).pop();
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    } else {
      embedUrl = url;
    }
  } catch {
    embedUrl = url;
  }

  const iframe = document.createElement('iframe');
  iframe.className = 'text-with-image-video-player';
  iframe.src = embedUrl;
  iframe.title = alt || 'Text with image video';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('frameborder', '0');
  media.append(iframe);
  return media;
}

function addVideoSchema(url, fields) {
  const uploadDate = fieldValue(fields, 'video upload date (for schema)');
  const title = fieldValue(fields, 'schema title (optional)') || fieldValue(fields, 'heading');
  const description = fieldValue(fields, 'video description (for schema)');
  if (!url || !uploadDate || !title || !description) return;

  const schema = document.createElement('script');
  schema.type = 'application/ld+json';
  schema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description,
    uploadDate,
    contentUrl: url,
    embedUrl: url,
  });
  document.head.append(schema);
}

function addCta(content, rows, fields, showField, textField, style) {
  const text = fieldValue(fields, textField);
  const sourceLink = getFieldLink(rows, textField);
  if (!isTrue(fieldValue(fields, showField)) || !text) return;

  const wrapper = content.querySelector('.text-with-image-cta')
    || document.createElement('div');
  wrapper.className = 'text-with-image-cta button-wrapper';
  const link = document.createElement('a');
  link.className = `button ${style}`;
  link.href = sourceLink?.href || '#';
  link.textContent = text;
  wrapper.append(link);
  if (!wrapper.parentElement) content.append(wrapper);
}

export default function decorate(block) {
  const rows = [...block.children];
  const fields = getFieldRows(block);
  const firstRow = rows[0];
  const cells = firstRow ? [...firstRow.children] : [];
  const imageCell = cells.find((cell) => cell.querySelector('picture'));
  const contentCell = cells.length > 1 ? cells.find((cell) => cell !== imageCell) : null;
  const picture = imageCell?.querySelector('picture') || block.querySelector('picture');
  const switchImage = isTrue(fieldValue(fields, 'switch image and text'))
    || block.classList.contains('image-left');
  const wideImage = isTrue(fieldValue(fields, 'widen image'));
  const compact = isTrue(fieldValue(fields, 'compact mode'));
  const alignTop = isTrue(fieldValue(fields, 'align content to the top of the container'));
  const videoUrl = getMediaUrl(rows, fields, 'video link');
  const isVideo = block.classList.contains('video')
    || block.classList.contains('text-with-image-video')
    || Boolean(videoUrl);

  const media = document.createElement('div');
  media.className = 'text-with-image-media';
  if (wideImage) media.classList.add('text-with-image-media-wide');
  if (isVideo) {
    const video = createVideoMedia(videoUrl, fieldValue(fields, 'alternative text for video'));
    if (video) media.append(video);
    addVideoSchema(videoUrl, fields);
  } else if (picture) {
    const image = picture.querySelector('img');
    const alt = fieldValue(fields, 'image alt');
    if (image) {
      image.classList.add('text-with-image-image');
      if (alt) image.alt = alt;
    }
    media.append(picture);
  }

  const content = document.createElement('div');
  content.className = 'text-with-image-content';
  if (wideImage) content.classList.add('text-with-image-content-wide');
  if (alignTop) content.classList.add('text-with-image-content-top');
  if (contentCell) {
    [...contentCell.children].forEach((child) => content.append(child));
  } else {
    const heading = fieldValue(fields, 'heading');
    const subHeading = fieldValue(fields, 'sub heading');
    const body = fieldValue(fields, 'body text');
    if (heading) content.insertAdjacentHTML('beforeend', `<h2>${heading}</h2>`);
    if (subHeading) content.insertAdjacentHTML('beforeend', `<h3>${subHeading}</h3>`);
    if (body) content.insertAdjacentHTML('beforeend', `<p>${body}</p>`);
    addCta(content, rows, fields, 'show cta button', 'cta button text', 'primary');
    addCta(content, rows, fields, 'show secondary cta button', 'secondary cta button text', 'secondary');
    rows.slice(picture ? 1 : 0).forEach((row) => {
      if (fields[getRowLabel(row)]) return;
      [...row.children].forEach((child) => content.append(child));
    });
  }

  content.querySelectorAll('a').forEach((link) => {
    if (!link.closest('.button-wrapper')) link.classList.add('text-with-image-link');
  });

  block.classList.toggle('text-with-image-switch', switchImage);
  block.classList.toggle('text-with-image-wide', wideImage);
  block.classList.toggle('text-with-image-compact', compact);
  block.classList.toggle('text-with-image-video-variant', isVideo);
  block.textContent = '';
  block.append(content, media);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          content.classList.add(switchImage ? 'slide-left' : 'slide-right');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    observer.observe(block);
  } else {
    content.classList.add('text-with-image-content-visible');
  }
}
