/**
 * Shared Marketo Forms2 helpers (from DatacomWebsite MarketoEmbedScript).
 */

import { enhanceMarketoForm } from './marketo-form-enhance.js';

export const MARKETO_MUNCHKIN_ID = '984-NJK-994';
// Always HTTPS: protocol-relative "//" becomes http on localhost and Marketo's XDFrame
// 307-redirects to https, which breaks postMessage (http targetOrigin vs https iframe).
export const MARKETO_FORMS_DOMAIN = 'https://digital.datacom.com';
export const MARKETO_FORMS2_SRC = 'https://digital.datacom.com/js/forms2/js/forms2.min.js';

export const DEFAULT_MARKETO_ID = '1846';
export const DEFAULT_FORM_TYPE = 'General contact us';
export const DEFAULT_BUTTON_TEXT = 'Contact us';
export const DEFAULT_INTRO = 'Do you have a question? Want to learn more about our products and solutions, the latest career opportunities, or our events? We\'re here to help. Get in touch with us.';

let forms2Promise;

/**
 * On http://localhost, Forms2 opens XDFrame as http://digital.datacom.com which
 * 307-redirects to https. postMessage then fails Forms2's protocol check, so
 * leadCapture never sends and the button sticks on "Please Wait".
 *
 * Prefer JSONP submit on plain-http local/dev hosts (Forms2's built-in fallback
 * when postMessage is unavailable). On https pages (preview/live) leave XD alone.
 */
function patchMarketoSubmitForHttpPages(MktoForms2) {
  if (typeof window === 'undefined' || window.location.protocol === 'https:') return;
  if (!MktoForms2?.Modernizr) return;
  // Forms2: cross-origin save uses XDFrame only when Modernizr.postmessage && .json
  MktoForms2.Modernizr.postmessage = false;
}

/**
 * Load MktoForms2 script once.
 * @returns {Promise<object>}
 */
export function loadMktoForms2() {
  if (window.MktoForms2) {
    patchMarketoSubmitForHttpPages(window.MktoForms2);
    return Promise.resolve(window.MktoForms2);
  }
  if (forms2Promise) return forms2Promise;

  forms2Promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MARKETO_FORMS2_SRC}"]`);
    if (existing && window.MktoForms2) {
      patchMarketoSubmitForHttpPages(window.MktoForms2);
      resolve(window.MktoForms2);
      return;
    }
    const script = document.createElement('script');
    script.src = MARKETO_FORMS2_SRC;
    script.async = true;
    script.onload = () => {
      if (window.MktoForms2) {
        patchMarketoSubmitForHttpPages(window.MktoForms2);
        resolve(window.MktoForms2);
      } else reject(new Error('MktoForms2 failed to initialize'));
    };
    script.onerror = () => reject(new Error('Failed to load Marketo Forms2'));
    document.head.appendChild(script);
  });

  return forms2Promise;
}

/**
 * Push FormSubmitted to digitalData when present (AEM parity).
 * @param {string} formType
 */
export function trackFormSubmitted(formType) {
  try {
    if (!window.digitalData) window.digitalData = {};
    if (!Array.isArray(window.digitalData.event)) window.digitalData.event = [];
    window.digitalData.event.push({
      eventName: 'FormSubmitted',
      timeStamp: new Date(),
      location: document.location.href,
      attribute: {
        formName: formType || DEFAULT_FORM_TYPE,
        formCompleted: 'true',
        formStarted: 'false',
      },
    });
  } catch (e) {
    // Adobe Launch rules on AEM selectors can throw on EDS pages — never block thank-you UI
    // eslint-disable-next-line no-console
    console.warn('FormSubmitted analytics skipped', e);
  }
}

/**
 * Load a Marketo form into an element with id mktoForm_{formId}.
 * @param {number|string} formId
 * @param {{ formType?: string, onSuccess?: Function }} [options]
 * @returns {Promise<object|null>}
 */
export async function loadMarketoForm(formId, options = {}) {
  const id = parseInt(String(formId), 10);
  if (!id) return null;

  const formEl = document.getElementById(`mktoForm_${id}`);
  if (!formEl) return null;

  // Avoid double-load into the same shell
  if (formEl.dataset.mktoLoaded === 'true') return window.MktoForms2?.getForm?.(id) || null;

  const MktoForms2 = await loadMktoForms2();

  return new Promise((resolve) => {
    MktoForms2.loadForm(MARKETO_FORMS_DOMAIN, MARKETO_MUNCHKIN_ID, id, (form) => {
      formEl.dataset.mktoLoaded = 'true';
      if (options.formType) formEl.setAttribute('data-form-type', options.formType);

      // Parity with AEM page-form: store previous URL when field exists
      const prev = formEl.querySelector('input[name="Custom_Field_8__c"]');
      if (prev) {
        prev.value = localStorage.getItem('previousURL') || "User doesn't have a previous URL";
      }

      const applyEnhance = () => {
        enhanceMarketoForm(form.getFormElem?.()?.[0] || formEl);
        // Re-apply after Marketo injects its captcha <script> (overwrites window.captchaCallback)
        wireMarketoCaptcha(id, form, formEl);
      };
      MktoForms2.whenReady(applyEnhance);
      // Marketo can paint rows after the load callback; retry briefly until enhanced
      let tries = 0;
      const retry = () => {
        applyEnhance();
        tries += 1;
        if (formEl.getAttribute('modified-form') !== 'true' && tries < 20) {
          window.setTimeout(retry, 50);
        }
      };
      retry();

      // Marketo's generated captchaCallback uses `this.MktoForms2`, which can fail depending
      // on how grecaptcha invokes it — leaving the button stuck on "Please Wait".
      wireMarketoCaptcha(id, form, formEl);

      let submitTimer;

      form.onSubmit(() => {
        formEl.dataset.mktoSubmitting = 'true';
        window.clearTimeout(submitTimer);

        const status = formEl.closest('.marketo-modal-dialog')
          ?.querySelector('.marketo-modal-status');
        if (status) status.hidden = true;

        const btn = formEl.querySelector('.mktoButtonRow button, .mktoButtonRow .mktoButton');
        if (btn && !btn.dataset.mktoOriginalLabel) {
          btn.dataset.mktoOriginalLabel = btn.textContent || 'Submit';
        }

        // Bridge grecaptcha Promise → setCaptchaValue if data-callback never fires
        bridgeCaptchaToken(id, formEl);

        // If Marketo/reCAPTCHA never completes, recover UI instead of leaving "Please Wait"
        submitTimer = window.setTimeout(() => {
          if (formEl.dataset.mktoSubmitting !== 'true') return;
          formEl.dataset.mktoSubmitting = 'false';
          formEl.dataset.mktoCaptchaResubmit = 'false';
          if (btn) {
            btn.disabled = false;
            btn.textContent = btn.dataset.mktoOriginalLabel || 'Submit';
            btn.classList.remove('is-disabled');
          }
          if (status) {
            status.hidden = false;
            status.textContent = 'Submission timed out. Please check your connection and try again.';
          }
          // eslint-disable-next-line no-console
          console.warn('Marketo form submit timed out (often reCAPTCHA/domain restrictions on localhost).');
        }, 20000);
      });

      form.onSuccess(() => {
        window.clearTimeout(submitTimer);
        formEl.dataset.mktoSubmitting = 'false';
        formEl.dataset.mktoCaptchaResubmit = 'false';
        // Show thank-you first — analytics/Launch must not block UI
        try {
          if (typeof options.onSuccess === 'function') options.onSuccess(form);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
        try {
          localStorage.removeItem('previousURL');
        } catch (e) { /* ignore */ }
        trackFormSubmitted(options.formType);
        return false; // stay on page; host UI handles thank-you
      });

      resolve(form);
    });
  });
}

/**
 * Invisible reCAPTCHA breaks inside overflow/transform containers (our modal).
 * Move the widget to document.body so grecaptcha.execute can run.
 * @param {HTMLElement} formEl
 */
function relocateCaptchaForModal(formEl) {
  const captcha = formEl.querySelector('.g-recaptcha, #captcha');
  if (!captcha || captcha.dataset.datacomRelocated === 'true') return;
  captcha.dataset.datacomRelocated = 'true';
  captcha.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;overflow:hidden;opacity:0;z-index:2147483647;';
  document.body.appendChild(captcha);
  // Marketo may inject captcha after first paint — retry briefly
  window.setTimeout(() => {
    const late = formEl.querySelector('.g-recaptcha, #captcha');
    if (late && late.dataset.datacomRelocated !== 'true') relocateCaptchaForModal(formEl);
  }, 500);
}

/**
 * Ensure invisible reCAPTCHA tokens reach MktoForms2.setCaptchaValue.
 * @param {number} formId
 * @param {object} form MktoForms2 form instance
 * @param {HTMLElement} formEl
 */
function wireMarketoCaptcha(formId, form, formEl) {
  if (formEl) relocateCaptchaForModal(formEl);

  const applyToken = (token) => {
    if (!token || !form) return;
    try {
      form.setCaptchaValue(token);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('setCaptchaValue failed', e);
    }
  };

  // Always point the global callback at window.MktoForms2 (re-apply if Marketo overwrote it)
  window.captchaCallback = function captchaCallback(token) {
    document.querySelectorAll('.grecaptcha-badge').forEach((badge) => {
      badge.style.visibility = 'hidden';
    });
    applyToken(token);
  };

  window.captchaExpired = function captchaExpired() {
    try {
      form.setCaptchaValue('');
    } catch (e) { /* ignore */ }
  };
}

/**
 * If grecaptcha.execute resolves a token but data-callback never runs, apply it manually.
 * Marketo calls execute(Captcha.siteKey) but the form JSON often only has sitekey (lowercase),
 * so the first argument is null — fall back to the rendered widget sitekey / widget id.
 * @param {number} formId
 * @param {HTMLElement} formEl
 */
function bridgeCaptchaToken(formId, formEl) {
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha?.execute || grecaptcha.__datacomBridged) return;
  grecaptcha.__datacomBridged = true;

  const original = grecaptcha.execute.bind(grecaptcha);
  grecaptcha.execute = (...args) => {
    // Forms2 passes Captcha.siteKey (often null) + {action} — v2 invisible needs widget id
    const nextArgs = (args[0] == null) ? [0] : args;
    const result = original(...nextArgs);
    if (result && typeof result.then === 'function') {
      result.then((token) => {
        if (!token || formEl.dataset.mktoSubmitting !== 'true') return;
        const form = window.MktoForms2?.getForm?.(formId);
        if (!form) return;
        try {
          form.setCaptchaValue(token);
        } catch (e) { /* ignore */ }
        // setCaptchaValue only stores the token — it does not continue save.
        // Forms2's own .then(save) is unreliable when execute was called with a null key;
        // re-submit once so the captchaToken short-circuit runs U()/leadCapture.
        if (formEl.dataset.mktoCaptchaResubmit === 'true') return;
        formEl.dataset.mktoCaptchaResubmit = 'true';
        window.setTimeout(() => {
          if (formEl.dataset.mktoSubmitting === 'true') form.submit();
        }, 0);
      }).catch(() => { /* ignore */ });
    }
    return result;
  };
}

/**
 * Read key/value rows from a block (UE key-value or document table).
 * @param {Element} block
 * @returns {Record<string, string>}
 */
export function readBlockConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    config[key] = cells[1].textContent.trim();
  });
  return config;
}
