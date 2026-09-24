function normalizeLabel(label = '') {
  return label.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseImageFromText(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';

  const markdownMatch = text.match(/!\[(?:.*?)\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownMatch) return markdownMatch[1];

  const fullUrlMatch = text.match(/https?:\/\/[^\s<>"]+/i);
  if (fullUrlMatch) return fullUrlMatch[0].replace(/[),.;]+$/, '');

  const imageCandidate = text.match(/(?:^|\s)(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|svg))(?:\s|$)/i);
  if (imageCandidate) return imageCandidate[1].replace(/[),.;]+$/, '');

  return '';
}

function getFieldValue(fields, ...keys) {
  const match = keys.find((key) => {
    const value = fields[normalizeLabel(key)];
    return typeof value !== 'undefined' && value !== null && value !== '';
  });

  return match ? fields[normalizeLabel(match)] : '';
}

function toBoolean(value = '') {
  return String(value).trim().toLowerCase() === 'true';
}

function buildFieldMap(block) {
  const fields = {};
  const rows = [...block.children];

  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const rowTexts = cells.map((cell) => cell.textContent.trim()).filter(Boolean);
    if (!rowTexts.length) return;

    const plainText = rowTexts.join(' ');
    const directImage = parseImageFromText(plainText);

    if (directImage) {
      fields['image of person'] = directImage;
      return;
    }

    if (!plainText.includes(':') && rowTexts.length === 1) {
      const label = rowTexts[0].trim().toLowerCase();
      if (['content', 'time and location', 'scroll button'].includes(label)) {
        return;
      }

      const imageAlias = /^(?:image(?: of person)?|author image|profile image|person image|photo|avatar)$/i;
      if (imageAlias.test(label)) {
        const nextRow = rows[index + 1];
        const nextUrl = nextRow ? parseImageFromText(nextRow.textContent.trim()) : '';
        if (nextUrl) {
          fields['image of person'] = nextUrl;
        }
        return;
      }
    }

    cells.forEach((cell) => {
      const text = cell.textContent.trim();
      if (!text) return;

      const directCellImage = parseImageFromText(text);
      if (directCellImage) {
        fields['image of person'] = directCellImage;
        return;
      }

      const match = text.match(/^(.+?)\s*:\s*(.*)$/);
      if (!match) return;

      const [, label, value] = match;
      if (!label || !value) return;

      const normalized = normalizeLabel(label);
      if (['image', 'image of person', 'author image', 'profile image', 'person image', 'photo', 'avatar'].includes(normalized)) {
        const parsed = parseImageFromText(value);
        if (parsed) {
          fields['image of person'] = parsed;
          return;
        }
      }

      fields[normalized] = value.trim();
    });

    if (Object.keys(fields).length) {
      const lastKey = Object.keys(fields).at(-1);
      if (lastKey) {
        const direct = row.querySelector('a');
        if (direct && fields[lastKey] === direct.textContent.trim()) {
          fields[`${lastKey}__href`] = direct.href;
        }
      }
    }
  });

  return fields;
}

function createSocialIcon(label, href) {
  const link = document.createElement('a');
  link.className = 'article-cover__social-link';
  link.href = href || '#';
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  link.setAttribute('aria-label', label);

  const labelText = document.createElement('span');
  labelText.className = 'article-cover__social-text';

  let shortLabel = 'f';
  if (label === 'LinkedIn') {
    shortLabel = 'in';
  } else if (label === 'X') {
    shortLabel = 'x';
  }

  labelText.textContent = shortLabel;
  link.append(labelText);
  return link;
}

function createLabelValue(label, value) {
  const row = document.createElement('div');
  row.className = 'article-cover__detail-row';

  const itemLabel = document.createElement('div');
  itemLabel.className = 'article-cover__detail-label';
  itemLabel.textContent = label;

  const itemValue = document.createElement('div');
  itemValue.className = 'article-cover__detail-value';
  itemValue.textContent = value;

  row.append(itemLabel, itemValue);
  return row;
}

export default function decorate(block) {
  const fields = buildFieldMap(block);
  const heading = getFieldValue(
    fields,
    'heading',
    'title',
    'event name',
    'name of article',
    'article title',
  ) || document.querySelector('main h1')?.textContent.trim() || 'Article';

  const description = getFieldValue(
    fields,
    'description',
    'summary',
    'event description',
    'short description',
  ) || 'Learn more about this article.';

  const authorName = getFieldValue(
    fields,
    'name of author',
    'author',
    'author name',
  );

  const authorRole = getFieldValue(
    fields,
    'designation of person',
    'designation',
    'role',
  );

  const authorImage = getFieldValue(
    fields,
    'image of person',
    'profile image',
    'image',
  ) || parseImageFromText(block.textContent || '');

  const showPostedDate = toBoolean(getFieldValue(fields, 'show posted date'));
  const postedDate = getFieldValue(fields, 'posted date', 'date', 'event date');
  const readTime = getFieldValue(fields, 'article read time', 'read time', 'minutes to read');

  const hideScrollButton = toBoolean(getFieldValue(fields, 'hide scroll button', 'hide scroll button?'));
  const scrollText = getFieldValue(fields, 'scroll button text', 'button text', 'anchor text') || 'Scroll to details';
  const anchorId = getFieldValue(fields, 'anchor id', 'anchor id?', 'anchortext') || 'article-cover-details';
  const anchorOffsetTablet = getFieldValue(fields, 'offset-tablet', 'offset tablet') || '0';
  const anchorOffsetDesktop = getFieldValue(fields, 'offset-desktop', 'offset desktop') || '0';

  const registrationEnd = getFieldValue(fields, 'registration end time');
  const eventStart = getFieldValue(fields, 'event start time');
  const eventEnd = getFieldValue(fields, 'event end time');
  const timeZone = getFieldValue(fields, 'time zone');
  const location = getFieldValue(fields, 'location', 'event location');
  const organizer = getFieldValue(fields, 'event organizer');
  const organizerEmail = getFieldValue(fields, 'event organizer email');
  const eventName = getFieldValue(fields, 'event name', 'event title');

  const socialLinks = [
    { label: 'Facebook', href: getFieldValue(fields, 'facebook url', 'facebook link') || 'https://www.facebook.com/' },
    { label: 'LinkedIn', href: getFieldValue(fields, 'linkedin url', 'linkedin link') || 'https://www.linkedin.com/' },
    { label: 'X', href: getFieldValue(fields, 'x url', 'twitter url', 'twitter link') || 'https://x.com/' },
  ];

  block.textContent = '';
  block.classList.add('article-cover');

  const wrapper = document.createElement('div');
  wrapper.className = 'article-cover__ctn';

  const leftCol = document.createElement('div');
  leftCol.className = 'article-cover__left-column';

  const metaRow = document.createElement('div');
  metaRow.className = 'article-cover__top-row';

  if (showPostedDate && postedDate) {
    const posted = document.createElement('div');
    posted.className = 'article-cover__posted-date';
    posted.textContent = postedDate;
    metaRow.append(posted);
  }

  if (readTime) {
    const read = document.createElement('div');
    read.className = 'article-cover__read-time';
    read.textContent = `${readTime} minutes to read`;
    metaRow.append(read);
  }

  if (metaRow.children.length) leftCol.append(metaRow);

  const h1 = document.createElement('h1');
  h1.className = 'article-cover__heading';
  h1.textContent = heading;
  leftCol.append(h1);

  if (description) {
    const desc = document.createElement('div');
    desc.className = 'article-cover__description';
    desc.textContent = description;
    leftCol.append(desc);
  }

  const bottomRow = document.createElement('div');
  bottomRow.className = 'article-cover__bottom-row';

  if (!hideScrollButton) {
    const scrollButton = document.createElement('button');
    scrollButton.type = 'button';
    scrollButton.className = 'article-cover__scroller';
    scrollButton.id = anchorId;
    scrollButton.textContent = scrollText;
    scrollButton.dataset.anchorOffsetTablet = anchorOffsetTablet;
    scrollButton.dataset.anchorOffsetDesktop = anchorOffsetDesktop;
    scrollButton.addEventListener('click', () => {
      const targetId = scrollButton.id;
      const target = document.getElementById(`${targetId}-stickyHeaderAnchor`) || document.getElementById(targetId);
      if (!target) return;

      const width = window.innerWidth;
      const breakpoint = width <= 900 ? 'tablet' : 'desktop';
      const value = Number(scrollButton.dataset[`anchorOffset${breakpoint === 'tablet' ? 'Tablet' : 'Desktop'}`] || 0);
      const top = target.getBoundingClientRect().top + window.scrollY - value;
      window.scrollTo({ top, behavior: 'smooth' });
    });
    bottomRow.append(scrollButton);
  }

  const profile = document.createElement('div');
  profile.className = 'article-cover__profile-ctn';

  if (authorImage) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'article-cover__profile-image-ctn';
    const img = document.createElement('img');
    img.className = 'article-cover__profile-image';
    img.src = authorImage;
    img.alt = authorName || 'Author';
    imageWrap.append(img);
    profile.append(imageWrap);
  }

  if (authorName || authorRole) {
    const info = document.createElement('div');
    info.className = 'article-cover__author-date-ctn';

    const authorBlock = document.createElement('div');
    authorBlock.className = 'article-cover__author-block';

    if (authorName) {
      const name = document.createElement('div');
      name.className = 'article-cover__author-name';
      name.textContent = authorName;
      authorBlock.append(name);
    }

    if (authorRole) {
      const role = document.createElement('div');
      role.className = 'article-cover__author-role';
      role.textContent = authorRole;
      authorBlock.append(role);
    }

    const socialWrap = document.createElement('div');
    socialWrap.className = 'article-cover__social-wrap';
    socialLinks.forEach(({ label, href }) => {
      if (!href || href === '#') return;
      socialWrap.append(createSocialIcon(label, href));
    });

    if (socialWrap.children.length) {
      authorBlock.append(socialWrap);
    }

    info.append(authorBlock);
    profile.append(info);
  }

  if (profile.children.length) bottomRow.append(profile);

  if (bottomRow.children.length) leftCol.append(bottomRow);

  const rightCol = document.createElement('div');
  rightCol.className = 'article-cover__right-column';

  if (registrationEnd) {
    rightCol.append(createLabelValue('Registration closes', registrationEnd));
  }

  if (eventStart || eventEnd || timeZone) {
    const labelValue = [];
    if (eventStart) labelValue.push(eventStart);
    if (eventEnd) labelValue.push(`to ${eventEnd}`);
    if (timeZone) labelValue.push(timeZone);
    rightCol.append(createLabelValue('Event details', labelValue.join(' • ')));
  }

  if (location) {
    rightCol.append(createLabelValue('Location', location));
  }

  if (organizer || organizerEmail || eventName) {
    const details = [];
    if (eventName) details.push(eventName);
    if (organizer) details.push(organizer);
    if (organizerEmail) details.push(organizerEmail);
    if (details.length) {
      rightCol.append(createLabelValue('Event info', details.join(' • ')));
    }
  }

  wrapper.append(leftCol, rightCol);
  block.append(wrapper);
}
