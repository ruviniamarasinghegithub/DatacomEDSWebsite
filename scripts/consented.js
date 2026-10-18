/**
 * Consent-gated marketing pixels — loaded after OneTrust grants C0005.
 * Converted from DatacomWebsite page/head.html (LinkedIn, Twitter, Facebook).
 * GTM / Adobe Launch load from delayed.js (same as AEM — not optanon-category gated).
 */

function loadScript(src) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

function loadLinkedIn() {
  window._linkedin_partner_id = '683193';
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
  loadScript('https://snap.licdn.com/li.lms-analytics/insight.min.js');
}

function loadTwitter() {
  window.twq = window.twq || function twq(...args) {
    const q = window.twq;
    // eslint-disable-next-line no-unused-expressions
    q.exe ? q.exe(...args) : q.queue.push(args);
  };
  window.twq.version = '1.1';
  window.twq.queue = window.twq.queue || [];
  loadScript('//static.ads-twitter.com/uwt.js');
  window.twq('init', 'o2sez');
  window.twq('track', 'PageView');
}

function loadFacebook() {
  if (window.fbq) return;
  const n = function fbq(...args) {
    // eslint-disable-next-line no-unused-expressions
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  };
  window.fbq = n;
  window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  loadScript('https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', '3562288187133971');
  window.fbq('track', 'PageView');
}

loadLinkedIn();
loadTwitter();
loadFacebook();