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

  const media = document.createElement('div');
  media.className = 'text-with-image-media';
  if (wideImage) media.classList.add('text-with-image-media-wide');
  if (picture) {
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
