/**
 * Marketo Modal (AEM marketo-modal + embed script).
 * Button opens a modal containing MktoForms2 form.
 * Defaults: Contact us / Marketo ID 1846 / General contact us — works with empty block.
 */

import {
  DEFAULT_BUTTON_TEXT,
  DEFAULT_FORM_TYPE,
  DEFAULT_INTRO,
  DEFAULT_MARKETO_ID,
  loadMarketoForm,
  readBlockConfig,
} from '../../scripts/marketo-forms.js';

const DEFAULT_THANK_YOU_HEADING = 'Thank you for getting in touch with us';
const DEFAULT_THANK_YOU_BODY = "We've received your message. One of our experts will be in touch with you soon.";
const DEFAULT_THANK_YOU_CTA = 'Return to homepage';

function homeHref() {
  // Prefer same-origin home; fall back to NZ site home used on datacom.com
  try {
    const { origin, pathname } = window.location;
    const match = pathname.match(/^\/([a-z]{2})\/(en|mi)(?:\/|$)/i);
    if (match) return `${origin}/${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
  } catch (e) { /* ignore */ }
  return 'https://datacom.com/nz/en';
}

function resolveConfig(block) {
  const config = readBlockConfig(block);
  return {
    buttonText: (config['button-text'] || config.buttonText || DEFAULT_BUTTON_TEXT).trim()
      || DEFAULT_BUTTON_TEXT,
    marketoId: config['marketo-id'] || config.marketoId || DEFAULT_MARKETO_ID,
    formType: config['form-type'] || config.formType || DEFAULT_FORM_TYPE,
    modalId: config['modal-id'] || config.modalId || 'marketo-modal',
    heading: config.heading || config['modal-heading'] || 'Contact us',
    intro: config.intro || config['intro-text'] || DEFAULT_INTRO,
    thankYouHeading: config['thank-you-heading'] || DEFAULT_THANK_YOU_HEADING,
    thankYouBody: config['thank-you-body'] || DEFAULT_THANK_YOU_BODY,
    thankYouCta: config['thank-you-cta'] || config['thank-you-cta-label'] || DEFAULT_THANK_YOU_CTA,
    thankYouHref: config['thank-you-href'] || config['thank-you-cta-link'] || homeHref(),
  };
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const {
    buttonText,
    marketoId,
    formType,
    modalId,
    heading,
    intro,
    thankYouHeading,
    thankYouBody,
    thankYouCta,
    thankYouHref,
  } = resolveConfig(block);

  block.textContent = '';
  block.classList.add('marketo-modal', 'cmp-mrkto-modal');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'marketo-modal-trigger';
  trigger.id = `marketo-modal-trigger-${modalId}`;
  trigger.textContent = buttonText;
  trigger.setAttribute('aria-haspopup', 'dialog');

  const backdrop = document.createElement('div');
  backdrop.className = 'marketo-modal-backdrop cmp-mrkto-modal__content';
  backdrop.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'marketo-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', `marketo-modal-title-${modalId}`);
  dialog.hidden = true;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'marketo-modal-close cmp-mrkto-modal__content__close';
  close.setAttribute('aria-label', 'Close');
  const closeIcon = document.createElement('i');
  closeIcon.className = 'fal fa-times';
  closeIcon.setAttribute('aria-hidden', 'true');
  close.append(closeIcon);

  const formView = document.createElement('div');
  formView.className = 'marketo-modal-form-view';

  const title = document.createElement('h3');
  title.className = 'marketo-modal-title';
  title.id = `marketo-modal-title-${modalId}`;
  title.textContent = heading;

  const introEl = document.createElement('p');
  introEl.className = 'marketo-modal-intro';
  introEl.textContent = intro;

  const formHost = document.createElement('div');
  formHost.className = 'marketo-modal-form';

  const form = document.createElement('form');
  form.id = `mktoForm_${marketoId}`;
  form.setAttribute('data-form-type', formType);
  formHost.append(form);

  const status = document.createElement('p');
  status.className = 'marketo-modal-status';
  status.hidden = true;

  formView.append(title, introEl, formHost, status);

  // Thank-you panel (matches datacom.com post-submit confirmation)
  const thankYou = document.createElement('div');
  thankYou.className = 'marketo-modal-thank-you post-form-confirmation__ctn';
  thankYou.hidden = true;
  thankYou.setAttribute('aria-live', 'polite');

  const thankYouTitle = document.createElement('h2');
  thankYouTitle.className = 'marketo-modal-thank-you-title';
  thankYouTitle.id = `marketo-modal-thank-you-title-${modalId}`;
  thankYouTitle.textContent = thankYouHeading;

  const thankYouBodyEl = document.createElement('p');
  thankYouBodyEl.className = 'marketo-modal-thank-you-body';
  thankYouBodyEl.textContent = thankYouBody;

  const thankYouCtaEl = document.createElement('a');
  thankYouCtaEl.className = 'marketo-modal-thank-you-cta cmp-cta-button cmp-cta-button--secondary cmp-cta-button--redirect';
  thankYouCtaEl.href = thankYouHref;
  thankYouCtaEl.textContent = thankYouCta;

  thankYou.append(thankYouTitle, thankYouBodyEl, thankYouCtaEl);

  dialog.append(close, formView, thankYou);
  backdrop.append(dialog);
  block.append(trigger, backdrop);

  let formLoadPromise = null;

  function showThankYou() {
    status.hidden = true;
    formView.hidden = true;
    thankYou.hidden = false;
    thankYou.classList.add('post-form-confirmation__ctn--show');
    dialog.setAttribute('aria-labelledby', thankYouTitle.id);
    thankYouCtaEl.focus();
  }

  async function ensureForm() {
    if (!formLoadPromise) {
      formLoadPromise = loadMarketoForm(marketoId, {
        formType,
        onSuccess: () => {
          showThankYou();
        },
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        status.hidden = false;
        status.textContent = 'Unable to load the form. Please try again later.';
        formLoadPromise = null;
      });
    }
    return formLoadPromise;
  }

  function openModal() {
    // Reset to form view when reopening
    thankYou.hidden = true;
    thankYou.classList.remove('post-form-confirmation__ctn--show');
    formView.hidden = false;
    dialog.setAttribute('aria-labelledby', title.id);

    backdrop.hidden = false;
    dialog.hidden = false;
    document.body.classList.add('marketo-modal-open');
    trigger.setAttribute('aria-expanded', 'true');
    close.focus();
    ensureForm().then(() => {
      if (dialog.hidden || formView.hidden) return;
      const firstInput = [...formHost.querySelectorAll('input:not([type="hidden"]):not(:disabled):not([readonly])')]
        .find((input) => input.getClientRects().length > 0);
      firstInput?.focus();
    });
  }

  function closeModal() {
    backdrop.hidden = true;
    dialog.hidden = true;
    document.body.classList.remove('marketo-modal-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', openModal);
  close.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !dialog.hidden) closeModal();
  });
}
