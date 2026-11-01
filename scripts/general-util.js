let currentToast = null;
let currentToastTimeout = null;
let hiddenTextHandlerAdded = false;

const ERROR_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="24" viewBox="0 0 28 24" fill="none" aria-hidden="true">'
  + '<path d="M8.08301 0.5H19.6299C20.1657 0.5 20.6607 0.785959 20.9287 1.25L26.7021 11.25C26.9701 11.7141 26.9701 12.2859 26.7021 12.75L20.9287 22.75C20.6607 23.214 20.1657 23.5 19.6299 23.5H8.08301C7.54716 23.5 7.05215 23.214 6.78418 22.75L1.01074 12.75C0.742793 12.2859 0.742793 11.7141 1.01074 11.25L6.78418 1.25C7.05215 0.785978 7.54716 0.5 8.08301 0.5Z" fill="#FA0000" stroke="#C80000"/>'
  + '<path d="M15.2582 11.9812L19.1268 8.15023L19.9155 7.3615C20.0282 7.24883 20.0282 7.06103 19.9155 6.9108L19.0892 6.08451C18.939 5.97183 18.7512 5.97183 18.6385 6.08451L14.0188 10.7418L9.3615 6.08451C9.24883 5.97183 9.06103 5.97183 8.9108 6.08451L8.08451 6.9108C7.97183 7.06103 7.97183 7.24883 8.08451 7.3615L12.7418 11.9812L8.08451 16.6385C7.97183 16.7512 7.97183 16.939 8.08451 17.0892L8.9108 17.9155C9.06103 18.0282 9.24883 18.0282 9.3615 17.9155L14.0188 13.2582L17.8498 17.1268L18.6385 17.9155C18.7512 18.0282 18.939 18.0282 19.0892 17.9155L19.9155 17.0892C20.0282 16.939 20.0282 16.7512 19.9155 16.6385L15.2582 11.9812Z" fill="#000A14"/>'
  + '</svg>';

function clearToastTimeout() {
  if (currentToastTimeout) {
    window.clearTimeout(currentToastTimeout);
    currentToastTimeout = null;
  }
}

function dismissToast(toast) {
  toast.classList.remove('show');
  window.setTimeout(() => {
    toast.remove();
    if (currentToast === toast) currentToast = null;
  }, 400);
}

function escapeAttribute(value) {
  return String(value).replace(/[&"<>']/g, (character) => ({
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
  }[character]));
}

function asElements(elem) {
  if (typeof elem === 'string') return [...document.querySelectorAll(elem)];
  if (elem instanceof Element) return [elem];
  return [...(elem || [])];
}

export const GeneralUtil = {
  applyTextEllipsis(elem, endIndex = 145) {
    asElements(elem).forEach((element) => {
      const text = element.textContent.trim();
      if (text.length <= 145) return;

      const displayText = document.createTextNode(text.substring(0, endIndex));
      const dots = document.createElement('p');
      dots.className = 'ellipses__dots';
      dots.textContent = '...';
      const link = document.createElement('a');
      link.className = 'ellipses__display-text';
      link.href = '#';
      link.textContent = 'Show More';
      const hidden = document.createElement('div');
      hidden.className = 'ellipses__hidden-text';
      hidden.textContent = text.substring(endIndex);

      element.replaceChildren(displayText, dots, link, hidden);
    });
  },

  showToast(message, isError = false) {
    clearToastTimeout();
    const text = String(message);

    if (currentToast) {
      const existingMessage = currentToast.querySelector('span')?.textContent;
      if (existingMessage === text) {
        currentToastTimeout = window.setTimeout(() => dismissToast(currentToast), 3000);
        return;
      }
      currentToast.remove();
      currentToast = null;
    }

    const toast = document.createElement('div');
    toast.className = isError ? 'toast-message toast-message--error' : 'toast-message';
    if (isError) {
      const icon = document.createElement('div');
      icon.className = 'toast-message-error-icon';
      icon.innerHTML = ERROR_ICON_SVG;
      toast.append(icon);
    }

    const messageElement = document.createElement('span');
    messageElement.textContent = text;
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-message-close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.type = 'button';
    closeButton.textContent = '\u00d7';
    closeButton.addEventListener('click', () => {
      clearToastTimeout();
      dismissToast(toast);
    });
    toast.append(messageElement, closeButton);
    document.body.append(toast);
    currentToast = toast;

    window.requestAnimationFrame(() => toast.classList.add('show'));
    currentToastTimeout = window.setTimeout(() => dismissToast(toast), 3000);
  },

  showHiddenText() {
    if (hiddenTextHandlerAdded) return;
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('.ellipses__display-text');
      if (!link) return;
      event.preventDefault();
      const container = link.parentElement;
      const hidden = link.nextElementSibling;
      if (!container || !hidden?.classList.contains('ellipses__hidden-text')) return;
      container.append(document.createTextNode(hidden.textContent));
      link.previousElementSibling?.remove();
      hidden.remove();
      link.remove();
    });
    hiddenTextHandlerAdded = true;
  },

  addTagSearch(elem) {
    const elements = asElements(elem);
    elements.forEach((element) => {
      let container = element.closest('[data-insights-category-path]');
      if (!container) container = element.querySelector('[data-insights-category-path]');
      const categoryPath = container?.getAttribute('data-insights-category-path');

      if (!categoryPath) {
        console.warn('insights-category-path data attribute is missing');
        return;
      }

      let searchUrl = window.location.pathname.includes('/nz/en') ? '/nz/en/search' : '/au/en/search';
      if (window.location.pathname.includes('/content/datacom')) {
        searchUrl = `/content/datacom${searchUrl}.html`;
      }

      element.querySelectorAll('.datacom-tag').forEach((tag) => {
        const tagName = tag.textContent.trim();
        if (tagName === 'Panel moderator') return;
        const params = new URLSearchParams({
          page: '1',
          sortBy: '',
          category: `/${categoryPath}`,
          region: '',
          tagCategories: tagName,
          tagContentTypes: '',
        });
        const link = document.createElement('a');
        link.href = `${searchUrl}?${params.toString()}`;
        link.textContent = tagName;
        tag.replaceChildren(link);
      });
    });
  },

  getSvgImageTag(svgPath, className = '', altText = '') {
    if (!svgPath) return '';
    const classAttr = className ? ` class="${escapeAttribute(className)}"` : '';
    return `<img src="${escapeAttribute(svgPath)}"${classAttr} alt="${escapeAttribute(altText)}" loading="lazy"/>`;
  },

  getGenericListStopWords() {
    return ['what', 'is', 'the', 'to', 'and', 'your', 'is', 'a', 'with', 'of'];
  },

  splitTitle(title) {
    return String(title).split(',').map((word) => word.trim().toLowerCase()).filter(Boolean);
  },

  normGenList(items) {
    return (items || [])
      .filter((item) => item && item.title !== undefined)
      .map((item) => ({ word: this.splitTitle(item.title), value: item.value }));
  },

  matchKeyword(query, genericList, stopWords) {
    const noMatch = { matched: false, word: '', index: -1 };
    const genericEntries = Array.isArray(genericList) ? genericList : [];
    const excludedWords = Array.isArray(stopWords) && stopWords.length > 0
      ? stopWords
      : this.getGenericListStopWords();
    const splitPrompt = String(query)
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean)
      .filter((word) => !excludedWords.includes(word));

    let match = noMatch;
    splitPrompt.some((promptWord) => {
      const listIndex = genericEntries.findIndex((entry) => entry.word.includes(promptWord));
      if (listIndex < 0) return false;
      match = { matched: true, word: promptWord, index: listIndex };
      return true;
    });
    return match;
  },

  validateInput(input, pattern = /^[`!@#$%^&*()_+\-=\x5B\x5D{};':"\\|,.<>/?~]*$/) {
    pattern.lastIndex = 0;
    const isValid = pattern.test(input);
    pattern.lastIndex = 0;
    return isValid;
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  },

  isValidPhoneNumber(phoneNumber) {
    return /^\+?\d+$/.test(String(phoneNumber));
  },

  isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
  },

  isTablet() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIPad = /ipad/.test(userAgent)
      || (/macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    const isAndroidTablet = /android/.test(userAgent) && !/mobile/.test(userAgent);
    return isIPad || isAndroidTablet;
  },
};

export function validateSafari() {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
}

export function validatedFireFox() {
  return navigator.userAgent.includes('Firefox');
}

export function validateMacOS() {
  const deviceOS = navigator.platform || navigator.userAgentData?.platform || '';
  return /macOS|MacIntel/i.test(deviceOS);
}

export default GeneralUtil;
