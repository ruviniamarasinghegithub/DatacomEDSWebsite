/**
 * Delayed functionality (martech / CMP).
 * Converted from DatacomWebsite head.html + clientlib-onetrust.
 * OneTrust and consent-gated pixels load via consent-check / consented.
 */

import { loadCSS } from './aem.js';
import './consent-check.js';

// Banner styles matching Datacom AEM OneTrust look
loadCSS(`${window.hlx.codeBasePath}/styles/onetrust.css`);

function isProdHost() {
  const { hostname } = window.location;
  return hostname === 'datacom.com' || hostname === 'www.datacom.com';
}

function isStageHost() {
  const { hostname } = window.location;
  return hostname === 'test.datacom.com' || hostname === 'www.test.datacom.com';
}

function loadScript(src) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
  return script;
}

/**
 * Adobe Analytics data layer — always present in AEM head before Launch.
 */
function initDigitalData() {
  if (window.digitalData) return;
  const path = window.location.pathname.split('/').filter(Boolean);
  const pageVar = path.length <= 2 ? 'homepage' : path[path.length - 1];
  const pageNameVar = path.length <= 2 ? 'datacom:homepage' : `datacom:${path.join(':')}`;
  window.digitalData = {
    page: {
      pageInfo: {
        pageName: pageNameVar,
        pageTitle: pageVar,
        pageURL: document.URL,
        piAld: '',
        piCld: '',
        analyticsId: '',
        locale: path[0],
        section: path[1] && path[1] !== pageVar ? path[1] : undefined,
        subSection: path[2] && path[2] !== pageVar ? path[2] : undefined,
        subSubSection: path[3] && path[3] !== pageVar ? path[3] : undefined,
        site: 'datacom',
      },
      category: { pageType: window.location.pathname },
      ctaButton: { linkURL: '' },
      embeddedVideo: { videoTitle: '' },
    },
    search: { searchTerm: '' },
    social: { clappedArticle: '', sharedArticle: '' },
    event: [],
  };
}

/**
 * Marketo Munchkin — not consent-category gated in AEM.
 */
function loadMunchkin() {
  let didInit = false;
  function initMunchkin() {
    if (didInit === false && window.Munchkin) {
      didInit = true;
      window.Munchkin.init('984-NJK-994');
    }
  }
  const s = loadScript('//munchkin.marketo.net/munchkin.js');
  s.onload = initMunchkin;
}

/**
 * Adobe Launch — env-specific, not optanon-category gated in AEM.
 */
function loadAdobeLaunch() {
  let launchUrl;
  if (isStageHost()) {
    launchUrl = '//assets.adobedtm.com/9e24dfcc7683/938b13643d4c/launch-2b089bbf5f30-staging.min.js';
  } else if (isProdHost()) {
    launchUrl = '//assets.adobedtm.com/9e24dfcc7683/938b13643d4c/launch-d0ca31bb20af.min.js';
  } else {
    launchUrl = '//assets.adobedtm.com/9e24dfcc7683/938b13643d4c/launch-3f9ef9562d29-development.min.js';
  }
  loadScript(launchUrl);
}

/**
 * Google Tag Manager — prod only in AEM; not optanon-category gated.
 */
function loadGtm() {
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s);
    const dl = l !== 'dataLayer' ? `&l=${l}` : '';
    j.async = true;
    j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`;
    f.parentNode.insertBefore(j, f);
  }(window, document, 'script', 'dataLayer', 'GTM-WRM7GL3'));
}

initDigitalData();
loadMunchkin();
loadAdobeLaunch();

if (isProdHost()) {
  loadGtm();
}