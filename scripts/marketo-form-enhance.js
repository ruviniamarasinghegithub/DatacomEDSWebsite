/**
 * Apply Datacom Marketo form styling helpers (from AEM CmpMarketoModal.changeForm).
 * Floating labels inside fields by default; float on focus/fill/error.
 */

const OVERRIDE_STYLE_ID = 'marketo-datacom-form-overrides';

/**
 * Marketo forms2.css loads after block CSS and wins the cascade.
 * Inject terminal overrides once so focus/error borders/colors stick.
 */
function ensureOverrideStyles() {
  let style = document.getElementById(OVERRIDE_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = OVERRIDE_STYLE_ID;
    style.textContent = `
.marketo-modal-form form.mktoForm input.aem-mrktoInput,
.marketo-modal-form form.mktoForm select.aem-mrktoSelect,
.marketo-modal-form form.mktoForm textarea.aem-mrktoTextArea {
  border: 1px solid #dadada !important;
  border-radius: 8px !important;
  background: transparent !important;
  box-shadow: none !important;
}
.marketo-modal-form form.mktoForm input.aem-mrktoInput:hover,
.marketo-modal-form form.mktoForm select.aem-mrktoSelect:hover,
.marketo-modal-form form.mktoForm textarea.aem-mrktoTextArea:hover {
  border-color: #0022cb !important;
}
.marketo-modal-form form.mktoForm input.aem-mrktoInput.focus,
.marketo-modal-form form.mktoForm select.aem-mrktoSelect.focus,
.marketo-modal-form form.mktoForm textarea.aem-mrktoTextArea.focus {
  border: 2px solid #002bfe !important;
  border-color: #002bfe !important;
  outline: none !important;
  box-shadow: none !important;
}
.marketo-modal-form form.mktoForm input.aem-mrktoInput.error,
.marketo-modal-form form.mktoForm select.aem-mrktoSelect.error,
.marketo-modal-form form.mktoForm textarea.aem-mrktoTextArea.error {
  border: 2px solid #c80000 !important;
  border-color: #c80000 !important;
  outline: none !important;
  box-shadow: none !important;
}
.marketo-modal-form .aem-mrktoWrap > .aem-mrktoLabel.focus {
  color: #666 !important;
}
.marketo-modal-form .aem-mrktoWrap:has(input.focus, select.focus, textarea.focus):not(:has(.error)) > .aem-mrktoLabel.focus {
  color: #002bfe !important;
}
.marketo-modal-form .aem-mrktoWrap > .aem-mrktoLabel.error {
  color: #c80000 !important;
}
.marketo-modal-form form.mktoForm .mktoButtonRow .mktoButton,
.marketo-modal-form form.mktoForm .cmp-form-button__btn {
  background-color: #002bfe !important;
  background-image: none !important;
  border: 0 !important;
  border-radius: 8px !important;
  color: #fff !important;
}
.marketo-modal-form form.mktoForm .mktoButtonRow .mktoButton:disabled,
.marketo-modal-form form.mktoForm .cmp-form-button__btn:disabled {
  background-color: #999 !important;
  color: #fff !important;
}
`;
  }
  // Re-append so this sheet always wins over late-loaded forms2.css
  document.head.appendChild(style);
}

function labelText(label) {
  return (label?.textContent || '').replace(/\*/g, '').trim();
}

function fieldHasValue(field) {
  if (!field) return false;
  if (field.tagName === 'SELECT') {
    const value = String(field.value || '').trim();
    if (!value) return false;
    const opt = field.options?.[field.selectedIndex];
    const text = (opt?.textContent || '').trim().toLowerCase();
    // Treat placeholder-like options as empty
    if (!text || text.startsWith('select') || text === '—' || text === '-') return false;
    return true;
  }
  return !!String(field.value || '').trim();
}

function ensureErrorAfter(row, message) {
  if (row.nextElementSibling?.classList.contains('message--error')) return;
  const err = document.createElement('div');
  err.className = 'message--error';
  err.textContent = message;
  row.after(err);
}

function addSelectChevron(select) {
  if (select.parentElement?.querySelector('.marketo-select-chevron')) return;
  const icon = document.createElement('span');
  icon.className = 'marketo-select-chevron';
  icon.setAttribute('aria-hidden', 'true');
  select.after(icon);
}

function isCaptchaOrProtected(el) {
  if (!el || el.nodeType !== 1) return true;
  return !!(
    el.closest?.('.g-recaptcha, .grecaptcha-badge, [class*="recaptcha"], [id*="recaptcha"]')
    || el.matches?.('iframe, .g-recaptcha, .grecaptcha-badge, textarea[name="g-recaptcha-response"]')
    || /recaptcha/i.test(el.className || '')
    || /recaptcha/i.test(el.id || '')
    || el.getAttribute?.('name') === 'g-recaptcha-response'
  );
}

function stripMarketoInlineLayout(formEl) {
  // Do NOT remove Marketo <style> tags — captcha / progressive profiling can depend on them.
  // Only clear layout junk on field wrappers; never touch captcha nodes or display/visibility.
  formEl.querySelectorAll('.mktoFormRow, .mktoFormCol, .mktoFieldDescriptor, .mktoFieldWrap, .mktoButtonRow').forEach((el) => {
    if (isCaptchaOrProtected(el)) return;
    const style = el.getAttribute('style');
    if (!style) return;
    // Preserve display/visibility (progressive fields + captcha); drop float/width layout only
    const kept = style
      .split(';')
      .map((part) => part.trim())
      .filter((part) => {
        if (!part) return false;
        const prop = part.split(':')[0].trim().toLowerCase();
        return !['width', 'max-width', 'min-width', 'float', 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'font-size', 'line-height'].includes(prop);
      });
    if (kept.length) el.setAttribute('style', `${kept.join('; ')};`);
    else el.removeAttribute('style');
  });

  formEl.style.width = '100%';
  formEl.style.maxWidth = 'none';
}

function isVisibleFieldWrap(wrap) {
  if (!wrap) return false;
  const row = wrap.closest('.mktoFormRow') || wrap;
  const style = window.getComputedStyle(row);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (row.hasAttribute('hidden') || row.classList.contains('hidden-wrapper')) return false;
  // offsetParent is null for display:none and some fixed cases; also check client height
  return !!(row.offsetParent || row.getClientRects().length);
}

function updateSubmitState(root) {
  const form = root?.closest?.('form') || root;
  if (!form) return;
  if (form.dataset?.mktoSubmitting === 'true') return;
  const submit = form.querySelector('.mktoButtonRow button[type="submit"], .mktoButtonRow .mktoButton');
  if (!submit) return;
  // Only visible required fields should block submit (progressive Marketo fields stay in DOM)
  const invalid = [...form.querySelectorAll('.mktoFieldWrap.mktoRequiredField[field-valid="false"]')]
    .filter(isVisibleFieldWrap)
    .length;
  submit.disabled = invalid > 0;
  submit.classList.toggle('is-disabled', invalid > 0);
  if (invalid === 0) {
    submit.style.removeProperty('pointer-events');
  }
}

function syncLabelState(field, label, { focused = false, errored = false } = {}) {
  if (!label) return;
  const filled = fieldHasValue(field);
  const showFloat = focused || filled || errored;
  label.classList.toggle('focus', showFloat);
  label.classList.toggle('error', errored);
  // Inline colors beat cross-origin Marketo forms2.css !important rules
  if (errored) {
    label.style.setProperty('color', '#c80000', 'important');
  } else if (focused) {
    label.style.setProperty('color', '#002bfe', 'important');
  } else {
    label.style.setProperty('color', '#666666', 'important');
  }
}

function syncFieldChrome(field, wrap, { focused = false, errored = false } = {}) {
  if (!field) return;
  if (errored) {
    field.style.setProperty('border', '2px solid #c80000', 'important');
    wrap?.classList.add('error');
  } else if (focused) {
    field.style.setProperty('border', '2px solid #002bfe', 'important');
    wrap?.classList.remove('error');
  } else {
    field.style.setProperty('border', '1px solid #dadada', 'important');
    wrap?.classList.remove('error');
  }
  field.style.setProperty('border-radius', '8px', 'important');
  field.style.setProperty('background', 'transparent', 'important');
  field.style.setProperty('box-shadow', 'none', 'important');
  field.style.setProperty('outline', 'none', 'important');
}

function wireFieldInteractions(form) {
  form.querySelectorAll('.aem-mrktoInput, .aem-mrktoTextArea, .aem-mrktoSelect').forEach((field) => {
    const wrap = field.closest('.mktoFieldWrap');
    const label = wrap?.querySelector('.aem-mrktoLabel');
    const row = field.closest('.mktoFormRow');
    const err = row?.nextElementSibling?.classList.contains('message--error')
      ? row.nextElementSibling
      : null;
    const chevron = wrap?.querySelector('.marketo-select-chevron');

    const clearError = () => {
      field.classList.remove('error');
      wrap?.classList.remove('error');
      label?.classList.remove('error');
      chevron?.classList.remove('error');
      err?.classList.remove('show');
    };

    const setError = () => {
      field.classList.add('error');
      field.classList.remove('focus');
      wrap?.classList.add('error');
      chevron?.classList.add('error');
      chevron?.classList.remove('focus');
      wrap?.setAttribute('field-valid', 'false');
      err?.classList.add('show');
      syncLabelState(field, label, { focused: false, errored: true });
      syncFieldChrome(field, wrap, { focused: false, errored: true });
    };

    field.addEventListener('focus', () => {
      clearError();
      field.classList.add('focus');
      chevron?.classList.add('focus');
      syncLabelState(field, label, { focused: true });
      syncFieldChrome(field, wrap, { focused: true });
    });

    field.addEventListener('blur', () => {
      field.classList.remove('focus');
      chevron?.classList.remove('focus');

      const required = wrap?.classList.contains('mktoRequiredField');
      const empty = !fieldHasValue(field);

      if (required && empty) {
        setError();
      } else if (required) {
        clearError();
        wrap?.setAttribute('field-valid', 'true');
        syncLabelState(field, label, { focused: false });
        syncFieldChrome(field, wrap, { focused: false });
      } else {
        syncLabelState(field, label, { focused: false });
        syncFieldChrome(field, wrap, { focused: false });
      }
      updateSubmitState(form);
    });

    field.addEventListener('input', () => {
      if (fieldHasValue(field)) {
        clearError();
        wrap?.setAttribute('field-valid', 'true');
      }
      syncLabelState(field, label, { focused: true });
      syncFieldChrome(field, wrap, { focused: true });
      updateSubmitState(form);
    });

    field.addEventListener('change', () => {
      if (fieldHasValue(field)) {
        clearError();
        wrap?.setAttribute('field-valid', 'true');
      }
      const focused = field === document.activeElement;
      syncLabelState(field, label, { focused });
      syncFieldChrome(field, wrap, { focused });
      updateSubmitState(form);
    });

    // Initial: only float if already filled (never force-float empty fields)
    syncLabelState(field, label, { focused: false });
    syncFieldChrome(field, wrap, { focused: false });
  });

  form.querySelectorAll('.aem-mrktoCheckBox input[type="checkbox"]').forEach((box) => {
    const wrap = box.closest('.mktoFieldWrap');
    const optionLabel = box.closest('label') || wrap?.querySelector('label:not(.mktoLabel)');
    const list = box.closest('.mktoCheckboxList');
    const sync = () => {
      optionLabel?.classList.toggle('checked', box.checked);
      list?.classList.toggle('checked', box.checked);
      if (wrap?.classList.contains('mktoRequiredField')) {
        wrap.setAttribute('field-valid', box.checked ? 'true' : 'false');
      }
      updateSubmitState(form);
    };
    box.addEventListener('change', sync);
    sync();
  });
}

/**
 * Style/enhance a loaded Marketo form to match datacom.com modal look.
 * @param {HTMLFormElement|Element} formEl
 */
export function enhanceMarketoForm(formEl) {
  if (!formEl || formEl.getAttribute('modified-form') === 'true') return;

  const rows = formEl.querySelectorAll('.mktoFormRow');
  // Marketo sometimes invokes callbacks before rows are in the DOM
  if (!rows.length) return;

  ensureOverrideStyles();
  stripMarketoInlineLayout(formEl);
  formEl.querySelectorAll('.mktoOffset, .mktoGutter').forEach((el) => el.remove());
  formEl.querySelectorAll('input[type="hidden"]').forEach((hidden) => {
    hidden.closest('.mktoFormRow')?.classList.add('hidden-wrapper');
  });

  rows.forEach((row) => {
    const descriptor = row.querySelector('.mktoFieldDescriptor');
    const wrap = row.querySelector('.mktoFieldWrap');
    const label = row.querySelector('label.mktoLabel');
    const input = row.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
    const textarea = row.querySelector('textarea');
    const select = row.querySelector('select');
    const checkbox = row.querySelector('input[type="checkbox"]');
    const htmlText = row.querySelector('.mktoHtmlText');

    if (!row.querySelector('.mktoPlaceholder') && !row.querySelector('input[type="hidden"]')) {
      row.classList.add('aem-mrktoFieldCtn');
    }
    descriptor?.classList.add('aem-mrktoDescrip');
    label?.classList.add('aem-mrktoLabel');

    // Ensure label is a sibling inside the wrap (absolute positioning context)
    if (label && wrap && label.parentElement !== wrap) {
      wrap.prepend(label);
    }

    if (input) {
      input.classList.add('aem-mrktoInput');
      wrap?.classList.add('aem-mrktoWrap');
      ensureErrorAfter(row, `Please enter your ${labelText(label)}`);
      if (wrap?.classList.contains('mktoRequiredField')) wrap.setAttribute('field-valid', 'false');
    } else if (textarea) {
      textarea.classList.add('aem-mrktoTextArea');
      wrap?.classList.add('aem-mrktoWrap');
      ensureErrorAfter(row, 'Please answer the question');
      if (wrap?.classList.contains('mktoRequiredField')) wrap.setAttribute('field-valid', 'false');
    } else if (select) {
      select.classList.add('aem-mrktoSelect');
      wrap?.classList.add('aem-mrktoWrap');
      addSelectChevron(select);
      ensureErrorAfter(row, 'Please select an option');
      if (wrap?.classList.contains('mktoRequiredField')) wrap.setAttribute('field-valid', 'false');
    } else if (checkbox) {
      wrap?.classList.add('aem-mrktoCheckBox', 'single-check-box__ctn');
      // Consent copy often lives in mktoLabel — keep it visible, never float it
      if (label) {
        label.classList.remove('aem-mrktoLabel', 'focus', 'error');
        label.removeAttribute('style');
      }
      if (wrap?.classList.contains('mktoRequiredField')) wrap.setAttribute('field-valid', 'false');
    } else if (htmlText) {
      htmlText.classList.add('aem-mrktoRichText');
      row.classList.add('aem-mrktoRichTextRow');
    }
  });

  const buttonRow = formEl.querySelector('.mktoButtonRow');
  if (buttonRow) {
    buttonRow.classList.add('cmp-form-button__btn-ctn', 'cmp-form-button__btn-ctn--right');
    buttonRow.querySelectorAll(':scope > span').forEach((span) => {
      span.removeAttribute('class');
      span.removeAttribute('style');
    });
    const btn = buttonRow.querySelector('button');
    if (btn) {
      btn.classList.add('cmp-form-button__btn');
      btn.disabled = true;
    }
  }

  formEl.setAttribute('modified-form', 'true');
  wireFieldInteractions(formEl);
  updateSubmitState(formEl);
  observeProgressiveFields(formEl);
}

/**
 * When Marketo shows conditional fields (e.g. Careers follow-ups), enhance the new rows.
 * @param {HTMLFormElement|Element} formEl
 */
function observeProgressiveFields(formEl) {
  if (formEl.dataset.mktoObserver === 'true') return;
  formEl.dataset.mktoObserver = 'true';

  const enhanceRow = (row) => {
    if (!row?.classList?.contains('mktoFormRow')) return;
    if (row.querySelector('.aem-mrktoWrap, .aem-mrktoCheckBox')) return;

    const wrap = row.querySelector('.mktoFieldWrap');
    const label = row.querySelector('label.mktoLabel');
    const input = row.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
    const textarea = row.querySelector('textarea:not([name="g-recaptcha-response"])');
    const select = row.querySelector('select');
    if (!input && !textarea && !select) return;

    row.classList.add('aem-mrktoFieldCtn');
    row.querySelector('.mktoFieldDescriptor')?.classList.add('aem-mrktoDescrip');
    label?.classList.add('aem-mrktoLabel');
    if (label && wrap && label.parentElement !== wrap) wrap.prepend(label);

    if (input) {
      input.classList.add('aem-mrktoInput');
      wrap?.classList.add('aem-mrktoWrap');
      ensureErrorAfter(row, `Please enter your ${labelText(label)}`);
    } else if (textarea) {
      textarea.classList.add('aem-mrktoTextArea');
      wrap?.classList.add('aem-mrktoWrap');
      ensureErrorAfter(row, 'Please answer the question');
    } else if (select) {
      select.classList.add('aem-mrktoSelect');
      wrap?.classList.add('aem-mrktoWrap');
      addSelectChevron(select);
      ensureErrorAfter(row, 'Please select an option');
    }

    if (wrap?.classList.contains('mktoRequiredField')) {
      wrap.setAttribute('field-valid', fieldHasValue(input || textarea || select) ? 'true' : 'false');
    }

    // Wire just this row's fields (updateSubmitState resolves the parent form)
    wireFieldInteractions(row);
    updateSubmitState(formEl);
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains('mktoFormRow')) enhanceRow(node);
        else node.querySelectorAll?.('.mktoFormRow').forEach(enhanceRow);
        if (node.classList?.contains('mktoFieldDescriptor')) {
          enhanceRow(node.closest('.mktoFormRow'));
        }
      });
    });
  });

  observer.observe(formEl, { childList: true, subtree: true });
}
