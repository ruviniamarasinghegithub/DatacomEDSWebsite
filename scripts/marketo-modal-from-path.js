/**
 * Open a Marketo form modal using config authored on a shared DA page
 * (Experience Fragment–style). Used by cta-button when Button action is
 * "MarketoModalFragment" and Modal page path points at that document.
 */

import { loadCSS } from './aem.js';
import {
  DEFAULT_FORM_TYPE,
  DEFAULT_INTRO,
  DEFAULT_MARKETO_ID,
  loadMarketoForm,
  readBlockConfig,
} from './marketo-forms.js';

const DEFAULT_THANK_YOU_HEADING = 'Thank you for getting in touch with us';
const DEFAULT_THANK_YOU_BODY = "We've received your message. One of our experts will be in touch with you soon.";
const DEFAULT_THANK_YOU_CTA = 'Return to homepage';
const HOST_ID = 'datacom-marketo-modal-host';

const configCache = new Map();
let stylesPromise;
let hostState;
let escapeBound = false;

function homeHref() {
  try {
    const { origin, pathname } = window.location;
    const match = pathname.match(/^\/([a-z]{2})\/(en|mi)(?:\/|$)/i);
    if (match) return `${origin}/${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
  } catch (e) { /* ignore */ }
  return 'https://datacom.com/nz/en';
}

/**
 * @param {string} path
 * @returns {string}
 */
export function normalizeModalPath(path) {
  if (!path) return '';
  let value = path.trim();
  const linkMatch = value.match(/href=["']([^"']+)["']/i);
  if (linkMatch) value = linkMatch[1];
  try {
    if (/^https?:\/\//i.test(value)) {
      value = new URL(value).pathname;
    }
  } catch (e) { /* keep raw */ }
  value = value.replace(/\.plain\.html$/i, '').replace(/\.html$/i, '');
  if (!value.startsWith('/')) value = `/${value}`;
  return value.replace(/\/+$/, '') || '/';
}

function ensureStyles() {
  if (!stylesPromise) {
    stylesPromise = loadCSS(`${window.hlx.codeBasePath}/blocks/marketo-modal/marketo-modal.css`);
  }
  return stylesPromise;
}

/**
 * @param {Element} root
 * @returns {object|null}
 */
function parseMarketoConfigFromDom(root) {
  const block = root.querySelector('.marketo-modal');
  if (!block) return null;
  const config = readBlockConfig(block);
  return {
    marketoId: config['marketo-id'] || config.marketoId || DEFAULT_MARKETO_ID,
    formType: config['form-type'] || config.formType || DEFAULT_FORM_TYPE,
    heading: config.heading || config['modal-heading'] || 'Contact us',
    intro: config.intro || config['intro-text'] || DEFAULT_INTRO,
    thankYouHeading: config['thank-you-heading'] || DEFAULT_THANK_YOU_HEADING,
    thankYouBody: config['thank-you-body'] || DEFAULT_THANK_YOU_BODY,
    thankYouCta: config['thank-you-cta'] || config['thank-you-cta-label'] || DEFAULT_THANK_YOU_CTA,
    thankYouHref: config['thank-you-href'] || config['thank-you-cta-link'] || homeHref(),
  };
}

/**
 * @param {string} path
 * @returns {Promise<object>}
 */
export async function loadMarketoConfigFromPath(path) {
  const normalized = normalizeModalPath(path);
  if (!normalized) {
    throw new Error('Modal page path is required.');
  }
  if (configCache.has(normalized)) {
    return configCache.get(normalized);
  }

  const resp = await fetch(`${normalized}.plain.html`);
  if (!resp.ok) {
    throw new Error(`Unable to load Marketo config from ${normalized} (${resp.status}).`);
  }
  const html = await resp.text();
  const container = document.createElement('div');
  container.innerHTML = html;
  const config = parseMarketoConfigFromDom(container);
  if (!config) {
    throw new Error(`No Marketo Modal block found at ${normalized}.`);
  }
  configCache.set(normalized, config);
  return config;
}

function ensureHost() {
  if (hostState?.root?.isConnected) return hostState;

  const root = document.createElement('div');
  root.id = HOST_ID;
  root.className = 'marketo-modal cmp-mrkto-modal datacom-marketo-modal-host';

  const backdrop = document.createElement('div');
  backdrop.className = 'marketo-modal-backdrop cmp-mrkto-modal__content';
  backdrop.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'marketo-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.hidden = true;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'marketo-modal-close cmp-mrkto-modal__content__close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '&times;';

  const formView = document.createElement('div');
  formView.className = 'marketo-modal-form-view';

  const title = document.createElement('h2');
  title.className = 'marketo-modal-title';
  title.id = `${HOST_ID}-title`;

  const introEl = document.createElement('p');
  introEl.className = 'marketo-modal-intro';

  const formHost = document.createElement('div');
  formHost.className = 'marketo-modal-form';

  const status = document.createElement('p');
  status.className = 'marketo-modal-status';
  status.hidden = true;

  formView.append(title, introEl, formHost, status);

  const thankYou = document.createElement('div');
  thankYou.className = 'marketo-modal-thank-you post-form-confirmation__ctn';
  thankYou.hidden = true;
  thankYou.setAttribute('aria-live', 'polite');

  const thankYouTitle = document.createElement('h2');
  thankYouTitle.className = 'marketo-modal-thank-you-title';
  thankYouTitle.id = `${HOST_ID}-thank-you-title`;

  const thankYouBodyEl = document.createElement('p');
  thankYouBodyEl.className = 'marketo-modal-thank-you-body';

  const thankYouCtaEl = document.createElement('a');
  thankYouCtaEl.className = 'marketo-modal-thank-you-cta cmp-cta-button cmp-cta-button--secondary cmp-cta-button--redirect';

  thankYou.append(thankYouTitle, thankYouBodyEl, thankYouCtaEl);
  dialog.append(close, formView, thankYou);
  backdrop.append(dialog);
  root.append(backdrop);
  document.body.append(root);

  hostState = {
    root,
    backdrop,
    dialog,
    close,
    formView,
    title,
    introEl,
    formHost,
    status,
    thankYou,
    thankYouTitle,
    thankYouBodyEl,
    thankYouCtaEl,
    trigger: null,
    formLoadPromise: null,
    loadedFormId: null,
  };

  const closeModal = () => {
    hostState.backdrop.hidden = true;
    hostState.dialog.hidden = true;
    document.body.classList.remove('marketo-modal-open');
    hostState.trigger?.setAttribute('aria-expanded', 'false');
    hostState.trigger?.focus?.();
  };

  hostState.closeModal = closeModal;
  close.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  if (!escapeBound) {
    escapeBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && hostState && !hostState.dialog.hidden) {
        hostState.closeModal();
      }
    });
  }

  return hostState;
}

function showThankYou(state) {
  state.status.hidden = true;
  state.formView.hidden = true;
  state.thankYou.hidden = false;
  state.thankYou.classList.add('post-form-confirmation__ctn--show');
  state.dialog.setAttribute('aria-labelledby', state.thankYouTitle.id);
  state.thankYouCtaEl.focus();
}

function applyConfig(state, config) {
  state.title.textContent = config.heading;
  state.introEl.textContent = config.intro;
  state.thankYouTitle.textContent = config.thankYouHeading;
  state.thankYouBodyEl.textContent = config.thankYouBody;
  state.thankYouCtaEl.href = config.thankYouHref;
  state.thankYouCtaEl.textContent = config.thankYouCta;
  state.dialog.setAttribute('aria-labelledby', state.title.id);
}

/**
 * Open Marketo form modal using config from a shared DA page path.
 * @param {string} path e.g. /fragments/contact-us or /neetika/marketo-test
 * @param {{ trigger?: HTMLElement }} [options]
 */
export async function openMarketoModalFromPath(path, options = {}) {
  await ensureStyles();
  const state = ensureHost();
  state.trigger = options.trigger || null;
  state.status.hidden = true;
  state.status.textContent = '';
  state.thankYou.hidden = true;
  state.thankYou.classList.remove('post-form-confirmation__ctn--show');
  state.formView.hidden = false;

  state.backdrop.hidden = false;
  state.dialog.hidden = false;
  document.body.classList.add('marketo-modal-open');
  state.trigger?.setAttribute('aria-expanded', 'true');
  state.close.focus();

  try {
    const config = await loadMarketoConfigFromPath(path);
    applyConfig(state, config);

    const formId = String(config.marketoId);
    if (state.loadedFormId !== formId) {
      state.formHost.replaceChildren();
      const form = document.createElement('form');
      form.id = `mktoForm_${formId}`;
      form.setAttribute('data-form-type', config.formType);
      state.formHost.append(form);
      state.formLoadPromise = null;
      state.loadedFormId = formId;
    }

    if (!state.formLoadPromise) {
      state.formLoadPromise = loadMarketoForm(formId, {
        formType: config.formType,
        onSuccess: () => showThankYou(state),
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        state.status.hidden = false;
        state.status.textContent = 'Unable to load the form. Please try again later.';
        state.formLoadPromise = null;
        state.loadedFormId = null;
      });
    }
    await state.formLoadPromise;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    state.status.hidden = false;
    state.status.textContent = e.message || 'Unable to load the form. Please try again later.';
  }
}
