/* Datacom - Sticky Header - EDS
 *
 * Supported document-authoring types:
 *   - anchors
 *   - buttons
 *
 * Modal and Experience Fragment types are intentionally not implemented.
 */

const CONFIG_DEFAULTS = {
  heading: '',
  type: 'anchors',
  sticky: true,
  showCta: false,
  numberedAnchors: false,
  theme: 'white',
  id: '',
  disableStickyHeader: false,
  hideHeading: false,
  activeItem: '',
  accessibility: '',
};

/**
 * Convert a string to a URL-safe anchor id.
 */
function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert common boolean values used in document authoring to boolean.
 */
function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalised = String(value).trim().toLowerCase();

  if (['true', 'yes', '1', 'on'].includes(normalised)) {
    return true;
  }

  if (['false', 'no', '0', 'off'].includes(normalised)) {
    return false;
  }

  return defaultValue;
}

/**
 * Read configuration from either:
 *
 *   | Heading | Our Services |
 *
 * or:
 *
 *   | Heading: Our Services |
 *
 * The first row containing the block name is ignored.
 */
function getConfig(block) {
  const config = { ...CONFIG_DEFAULTS };
  const rows = [...block.children];

  rows.forEach((row, index) => {
    const cells = [...row.children]
      .map((cell) => cell.textContent.trim())
      .filter(Boolean);

    if (!cells.length) {
      return;
    }

    let key = '';
    let value = '';

    if (cells.length >= 2) {
      key = cells[0];
      value = cells.slice(1).join(' ').trim();
    } else {
      const separatorIndex = cells[0].indexOf(':');

      if (separatorIndex === -1) {
        // The first row is normally the block title.
        if (index === 0) {
          return;
        }

        key = cells[0];
      } else {
        key = cells[0].slice(0, separatorIndex).trim();
        value = cells[0].slice(separatorIndex + 1).trim();
      }
    }

    const normalisedKey = key
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

    switch (normalisedKey) {
      case 'heading':
        config.heading = value;
        break;

      case 'type':
        config.type = value || config.type;
        break;

      case 'sticky':
        config.sticky = toBoolean(value, config.sticky);
        break;

      case 'showcta':
        config.showCta = toBoolean(value, config.showCta);
        break;

      case 'numberedanchors':
        config.numberedAnchors = toBoolean(
          value,
          config.numberedAnchors,
        );
        break;

      case 'theme':
        config.theme = value || config.theme;
        break;

      case 'id':
        config.id = value;
        break;

      case 'disablestickyheader':
        config.disableStickyHeader = toBoolean(
          value,
          config.disableStickyHeader,
        );
        break;

      case 'hideheading':
        config.hideHeading = toBoolean(
          value,
          config.hideHeading,
        );
        break;

      case 'activeitem':
        config.activeItem = value;
        break;

      case 'accessibility':
      case 'accessibilitylabel':
        config.accessibility = value;
        break;

      default:
        break;
    }
  });

  return config;
}

/**
 * Find page sections that can be used as anchor targets.
 *
 * The old AEM component generated anchors from authored anchor nodes.
 * In EDS, the equivalent is an element on the page with an id.
 */
function getAnchorTargets(block) {
  const excludedIds = new Set([
    'main',
    'content',
    'header',
    'footer',
    'skip-to-content',
  ]);

  return [...document.querySelectorAll('[id]')]
    .filter((element) => !block.contains(element))
    .filter((element) => !excludedIds.has(element.id))
    .filter((element) => !element.closest('.sticky-header'))
    .map((element) => {
      const heading = element.querySelector(
        ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
      ) || element.querySelector(
        'h1, h2, h3, h4, h5, h6',
      );

      const text =
        heading?.textContent.trim()
        || element.getAttribute('aria-label')
        || element.id;

      return {
        id: element.id,
        label: text,
        element,
      };
    })
    .filter((item) => item.label);
}

/**
 * Get the height of the existing Datacom mega header, if present.
 */
function getHeaderHeight() {
  const header = document.querySelector('.cmp-header-mega');

  return header
    ? header.getBoundingClientRect().height
    : 0;
}

/**
 * Scroll to an anchor while accounting for the Datacom header
 * and sticky header.
 */
function scrollToTarget(target, stickyBlock) {
  if (!target) {
    return;
  }

  const headerHeight = getHeaderHeight();
  const stickyHeight = stickyBlock.getBoundingClientRect().height;

  const top =
    window.scrollY
    + target.getBoundingClientRect().top
    - headerHeight
    - stickyHeight
    - 16;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  });
}

/**
 * Update active anchor state.
 */
function setActiveItem(stickyBlock, item) {
  if (!item) {
    return;
  }

  stickyBlock
    .querySelectorAll('.sticky-header__item')
    .forEach((anchorItem) => {
      const isActive = anchorItem === item;

      anchorItem.classList.toggle(
        'is-active',
        isActive,
      );

      const link = anchorItem.querySelector('a');

      if (link) {
        if (isActive) {
          link.setAttribute(
            'aria-current',
            'location',
          );
        } else {
          link.removeAttribute(
            'aria-current',
          );
        }
      }
    });

  const dropdown = stickyBlock.querySelector(
    '.sticky-header__dropdown',
  );

  if (
    dropdown
    && item.dataset.label
  ) {
    dropdown.value = item.dataset.id || '';
  }
}

/**
 * Create the anchor navigation.
 */
function buildAnchorNavigation(stickyBlock, config) {
  const targets = getAnchorTargets(stickyBlock);

  if (!targets.length) {
    return;
  }

  const nav = document.createElement('nav');

  nav.className = 'sticky-header__navigation';

  nav.setAttribute(
    'aria-label',
    config.accessibility || 'Section navigation',
  );

  const previousButton = document.createElement('button');

  previousButton.type = 'button';
  previousButton.className =
    'sticky-header__arrow sticky-header__arrow--previous';
  previousButton.setAttribute(
    'aria-label',
    'Previous section',
  );

  previousButton.innerHTML =
    '<span aria-hidden="true">‹</span>';

  const list = document.createElement('ol');

  list.className = 'sticky-header__list';

  const nextButton = document.createElement('button');

  nextButton.type = 'button';
  nextButton.className =
    'sticky-header__arrow sticky-header__arrow--next';
  nextButton.setAttribute(
    'aria-label',
    'Next section',
  );

  nextButton.innerHTML =
    '<span aria-hidden="true">›</span>';

  targets.forEach((target, index) => {
    const listItem = document.createElement('li');

    listItem.className =
      'sticky-header__item';

    listItem.dataset.id = target.id;
    listItem.dataset.label = target.label;

    const link = document.createElement('a');

    link.className =
      'sticky-header__link';

    link.href = `#${target.id}`;
    link.textContent = target.label;

    if (config.numberedAnchors) {
      listItem.style.setProperty(
        '--sticky-header-index',
        index + 1,
      );
    }

    const progress = document.createElement('span');

    progress.className =
      'sticky-header__progress';

    progress.setAttribute(
      'aria-hidden',
      'true',
    );

    listItem.append(
      link,
      progress,
    );

    list.appendChild(listItem);

    link.addEventListener(
      'click',
      (event) => {
        event.preventDefault();

        setActiveItem(
          stickyBlock,
          listItem,
        );

        scrollToTarget(
          target.element,
          stickyBlock,
        );

        history.replaceState(
          null,
          '',
          `#${target.id}`,
        );
      },
    );
  });

  previousButton.addEventListener(
    'click',
    () => {
      const activeItem =
        stickyBlock.querySelector(
          '.sticky-header__item.is-active',
        );

      const activeIndex =
        targets.findIndex(
          (target) =>
            target.id === activeItem?.dataset.id,
        );

      const nextIndex = Math.max(
        0,
        activeIndex - 1,
      );

      scrollToTarget(
        targets[nextIndex].element,
        stickyBlock,
      );

      setActiveItem(
        stickyBlock,
        stickyBlock.querySelectorAll(
          '.sticky-header__item',
        )[nextIndex],
      );
    },
  );

  nextButton.addEventListener(
    'click',
    () => {
      const activeItem =
        stickyBlock.querySelector(
          '.sticky-header__item.is-active',
        );

      const activeIndex =
        targets.findIndex(
          (target) =>
            target.id === activeItem?.dataset.id,
        );

      const nextIndex = Math.min(
        targets.length - 1,
        activeIndex < 0
          ? 0
          : activeIndex + 1,
      );

      scrollToTarget(
        targets[nextIndex].element,
        stickyBlock,
      );

      setActiveItem(
        stickyBlock,
        stickyBlock.querySelectorAll(
          '.sticky-header__item',
        )[nextIndex],
      );
    },
  );

  nav.append(
    previousButton,
    list,
    nextButton,
  );

  /*
   * Mobile dropdown.
   */
  const select =
    document.createElement('select');

  select.className =
    'sticky-header__dropdown';

  select.setAttribute(
    'aria-label',
    config.accessibility
      || 'Select section',
  );

  targets.forEach((target) => {
    const option =
      document.createElement('option');

    option.value = target.id;
    option.textContent = target.label;

    select.appendChild(option);
  });

  select.addEventListener(
    'change',
    () => {
      const target = targets.find(
        (item) =>
          item.id === select.value,
      );

      if (!target) {
        return;
      }

      const item =
        stickyBlock.querySelector(
          `.sticky-header__item[data-id="${CSS.escape(target.id)}"]`,
        );

      setActiveItem(
        stickyBlock,
        item,
      );

      scrollToTarget(
        target.element,
        stickyBlock,
      );

      history.replaceState(
        null,
        '',
        `#${target.id}`,
      );
    },
  );

  const dropdownWrapper =
    document.createElement('div');

  dropdownWrapper.className =
    'sticky-header__dropdown-wrapper';

  dropdownWrapper.appendChild(select);

  nav.appendChild(
    dropdownWrapper,
  );

  stickyBlock.appendChild(nav);

  /*
   * Initial active item.
   */
  let initialId =
    config.activeItem
      .replace(/^#/, '')
      .trim();

  if (initialId) {
    const matchingTarget =
      targets.find(
        (target) =>
          target.id.toLowerCase()
          === initialId.toLowerCase()
          || slugify(target.label)
          === slugify(initialId),
      );

    if (matchingTarget) {
      initialId =
        matchingTarget.id;
    }
  }

  const hashId =
    decodeURIComponent(
      window.location.hash.replace(
        /^#/,
        '',
      ),
    );

  const initialTarget =
    targets.find(
      (target) =>
        target.id === initialId
        || target.id === hashId,
    ) || targets[0];

  const initialItem =
    stickyBlock.querySelector(
      `.sticky-header__item[data-id="${CSS.escape(initialTarget.id)}"]`,
    );

  setActiveItem(
    stickyBlock,
    initialItem,
  );

  /*
   * Keep active item in sync while scrolling.
   */
  const observer =
    new IntersectionObserver(
      (entries) => {
        const visible =
          entries
            .filter(
              (entry) =>
                entry.isIntersecting,
            )
            .sort(
              (a, b) =>
                a.boundingClientRect.top
                - b.boundingClientRect.top,
            );

        if (!visible.length) {
          return;
        }

        const activeTarget =
          visible[0].target;

        const activeItem =
          stickyBlock.querySelector(
            `.sticky-header__item[data-id="${CSS.escape(activeTarget.id)}"]`,
          );

        setActiveItem(
          stickyBlock,
          activeItem,
        );
      },
      {
        rootMargin:
          `-${getHeaderHeight() + 24}px 0px -60% 0px`,
        threshold: 0,
      },
    );

  targets.forEach(
    (target) =>
      observer.observe(
        target.element,
      ),
  );

  stickyBlock._stickyHeaderObserver =
    observer;
}

/**
 * Create a CTA/button navigation item.
 *
 * The EDS block can contain a link/button after
 * the configuration rows.
 */
function buildButtonNavigation(
  stickyBlock,
  config,
) {
  const links = [
    ...stickyBlock.querySelectorAll(
      'a, button',
    ),
  ];

  const configuredLink =
    links.find((element) => {
      const text =
        element.textContent
          .trim()
          .toLowerCase();

      return (
        text
        && ![
          'previous section',
          'next section',
        ].includes(text)
      );
    });

  if (!configuredLink) {
    return;
  }

  const wrapper =
    document.createElement('div');

  wrapper.className =
    'sticky-header__button-container';

  if (
    configuredLink.tagName === 'A'
  ) {
    configuredLink.classList.add(
      'sticky-header__button',
    );

    wrapper.appendChild(
      configuredLink.cloneNode(true),
    );
  } else {
    const button =
      configuredLink.cloneNode(true);

    button.classList.add(
      'sticky-header__button',
    );

    wrapper.appendChild(button);
  }

  /*
   * Remove the original authoring
   * content from the rendered block.
   */
  links.forEach(
    (element) => element.remove(),
  );

  stickyBlock.appendChild(wrapper);
}

/**
 * Sticky behaviour.
 *
 * This keeps the existing Datacom mega-header
 * classes used by the AEM implementation where
 * they exist, while remaining safe if those
 * elements are not present on an EDS page.
 */
function setupStickyBehaviour(
  stickyBlock,
  config,
) {
  if (
    !config.sticky
    || config.disableStickyHeader
  ) {
    return;
  }

  const header =
    document.querySelector(
      '.cmp-header-mega',
    );

  const navigation =
    stickyBlock.querySelector(
      '.sticky-header__navigation',
    );

  if (!navigation) {
    return;
  }

  const sentinel =
    document.createElement('div');

  sentinel.className =
    'sticky-header__sentinel';

  stickyBlock.parentNode.insertBefore(
    sentinel,
    stickyBlock,
  );

  let isSticky = false;
  let lastScrollY = window.scrollY;

  const update = () => {
    const headerHeight = header
      ? header.getBoundingClientRect()
        .height
      : 0;

    stickyBlock.style.setProperty(
      '--sticky-header-top',
      `${headerHeight}px`,
    );

    const shouldStick =
      sentinel.getBoundingClientRect()
        .top <= headerHeight;

    if (shouldStick !== isSticky) {
      isSticky = shouldStick;

      stickyBlock.classList.toggle(
        'is-sticky',
        isSticky,
      );

      if (header) {
        header.classList.toggle(
          'cmp-header-mega--sticky-header',
          isSticky,
        );
      }
    }

    if (isSticky) {
      const scrollingDown =
        window.scrollY > lastScrollY;

      stickyBlock.classList.toggle(
        'is-scrolling-down',
        scrollingDown,
      );
    }

    lastScrollY = window.scrollY;
  };

  let ticking = false;

  const onScroll = () => {
    if (ticking) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        update();
        ticking = false;
      },
    );

    ticking = true;
  };

  window.addEventListener(
    'scroll',
    onScroll,
    { passive: true },
  );

  window.addEventListener(
    'resize',
    update,
  );

  update();

  stickyBlock._stickyHeaderCleanup =
    () => {
      window.removeEventListener(
        'scroll',
        onScroll,
      );

      window.removeEventListener(
        'resize',
        update,
      );

      sentinel.remove();
    };
}

/**
 * Main EDS block decoration entry point.
 */
export default function decorate(block) {
  const config =
    getConfig(block);

  block.classList.add(
    'sticky-header',
  );

  if (config.id) {
    block.id =
      slugify(config.id);
  }

  const type =
    config.type
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '');

  block.dataset.type =
    type;

  block.dataset.sticky =
    String(
      config.sticky
      && !config.disableStickyHeader,
    );

  block.dataset.theme =
    config.theme.toLowerCase();

  /*
   * Keep configuration data hidden
   * from the final rendered UI.
   */
  [...block.children].forEach(
    (row) => {
      row.hidden = true;
    },
  );

  if (
    config.heading
    && !config.hideHeading
  ) {
    const heading =
      document.createElement('h2');

    heading.className =
      'sticky-header__heading';

    heading.textContent =
      config.heading;

    block.appendChild(heading);
  }

  if (
    type === 'anchors'
    || type === 'anchor'
  ) {
    buildAnchorNavigation(
      block,
      config,
    );
  } else if (
    type === 'buttons'
    || type === 'button'
    || type === 'cta'
  ) {
    if (config.showCta) {
      buildButtonNavigation(
        block,
        config,
      );
    }
  } else {
    /*
     * Modal and Experience Fragment
     * types are intentionally not implemented.
     */
    block.dataset.unsupportedType =
      type;
  }

  setupStickyBehaviour(
    block,
    config,
  );
}