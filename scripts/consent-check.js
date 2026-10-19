/**
 * OneTrust CMP loader for Edge Delivery Services.
 * Converted from DatacomWebsite clientlib-onetrust/load-cookie.js + head.html OptanonWrapper.
 * @see https://www.aem.live/developer/cmp-integration
 */

const DOMAIN_TEST = '470ce855-54c5-4281-b008-578c6d5bf507-test';
const DOMAIN_PROD = '470ce855-54c5-4281-b008-578c6d5bf507';
const CDN_HOST = 'https://cdn-au.onetrust.com';

/** Marketing / targeting category used on Datacom AEM (optanon-category-C0005). */
const MARKETING_GROUP = 'C0005';

let consentedLoaded = false;
let toggleOrderObserver;

function isProdHost() {
  const { hostname } = window.location;
  return hostname === 'datacom.com' || hostname === 'www.datacom.com';
}

function getDomainScript() {
  return isProdHost() ? DOMAIN_PROD : DOMAIN_TEST;
}

function addLinkElement(rel, href, as) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (as) link.as = as;
  document.head.appendChild(link);
}

function loadConsented() {
  if (consentedLoaded) return;
  consentedLoaded = true;
  import('./consented.js');
}

function hasMarketingConsent(activeGroups) {
  return (activeGroups || '').includes(MARKETING_GROUP)
    || (activeGroups || '').includes('C0004');
}

function arrangeCategoryToggles() {
  const consentSdk = document.getElementById('onetrust-consent-sdk');
  if (!consentSdk || toggleOrderObserver) return;

  const moveToggles = () => {
    consentSdk.querySelectorAll('.ot-acc-hdr').forEach((header) => {
      const toggle = header.querySelector(':scope > .ot-tgl');
      const heading = header.querySelector(':scope > .ot-cat-header');
      if (toggle && heading && toggle.nextElementSibling !== heading) {
        header.insertBefore(toggle, heading);
      }
    });
  };

  moveToggles();
  toggleOrderObserver = new MutationObserver(moveToggles);
  toggleOrderObserver.observe(consentSdk, { childList: true, subtree: true });
}

/**
 * OneTrust invokes this when the banner initializes and when preferences change.
 */
window.OptanonWrapper = () => {
  arrangeCategoryToggles();
  const activeGroups = window.OnetrustActiveGroups || '';
  const consented = hasMarketingConsent(activeGroups);
  window.dispatchEvent(new CustomEvent('consent.update', {
    detail: { consented, groups: activeGroups },
  }));
  if (consented) {
    loadConsented();
  }
};

function loadOneTrust() {
  const domainScript = getDomainScript();
  const base = `${CDN_HOST}/consent/${domainScript}`;
  const otAuto = `${base}/OtAutoBlock.js`;
  const otSdk = `${base}/otSDKStub.js`;

  addLinkElement('preconnect', CDN_HOST);
  addLinkElement('dns-prefetch', CDN_HOST);
  addLinkElement('preload', otAuto, 'script');
  addLinkElement('preload', otSdk, 'script');

  const autoBlock = document.createElement('script');
  autoBlock.type = 'text/javascript';
  autoBlock.src = otAuto;
  autoBlock.async = true;
  document.head.appendChild(autoBlock);

  const stub = document.createElement('script');
  stub.type = 'text/javascript';
  stub.src = otSdk;
  stub.async = true;
  stub.charset = 'UTF-8';
  stub.setAttribute('data-domain-script', domainScript);
  document.head.appendChild(stub);
}

loadOneTrust();
