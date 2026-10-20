# CTA Marketo modal (shared form page)

Author a Marketo form **once** on a shared DA page, then point CTAs at that
path from banners or any page. This is the EDS equivalent of an Experience
Fragment for the contact form.

## 1. Shared form page (author once)

Create a document such as `/fragments/contact-us` or `/neetika/marketo-test`
with a **Marketo Modal** table. Include **Button Text** so the page itself can
show a trigger. When a **CTA** opens this page via Modal page path, the
**CTA Button text** is what users see (it takes priority over Marketo Modal
Button Text).

| Marketo Modal | |
| --- | --- |
| Button Text | Contact us |
| Marketo ID | 1846 |
| Form Type | General contact us |
| Modal heading | Contact us |
| Intro text | Do you have a question? … |
| Thank you heading | Thank you for getting in touch with us |
| Thank you body | We've received your message. … |
| Thank you CTA label | Return to homepage |
| Thank you CTA link | /nz/en |

Preview/publish this document. Changing Marketo ID or copy here updates every
CTA that references the path.

## 2. CTA on each page (or inside Full Width Banner)

Nest a **cta-button** table (standalone or inside Full Width Banner):

### Redirect (default)

| cta-button | |
| --- | --- |
| Button text (Must not exceed 40 characters) * | Contact us |
| Button Link * | /contact-us |
| Button action | redirect |
| Button Style (Options: Primary, Secondary or Tertiary) | Tertiary |
| Button Theme (Options: White, Dark or Light) | Light |

### MarketoModalFragment (open form in modal)

| cta-button | |
| --- | --- |
| Button text (Must not exceed 40 characters) * | Contact us |
| Button Link * | N/A |
| Button action | MarketoModalFragment |
| Modal page path | /neetika/marketo-test |
| Button Style (Options: Primary, Secondary or Tertiary) | Tertiary |
| Button Theme (Options: White, Dark or Light) | Light |

- **Button action** values: `redirect` or `MarketoModalFragment`
- **Modal page path**: site path to the shared form doc (with or without `.html`)
- When action is **MarketoModalFragment**, set **Button Link** to `N/A` (or leave blank) — it is
  not used for navigation. Keep **Modal page path** filled (e.g. `/neetika/marketo-test`).
  Placeholders `N/A`, `/`, `#`, and blank are ignored for the link.
- When action is **redirect**, Modal page path is ignored and Button Link is required

## 3. Behaviour

1. User clicks the CTA
2. Browser fetches `{path}.plain.html`
3. Code reads Marketo ID / copy from the Marketo block on that page
4. Shared modal opens (same UI as Marketo Modal) and loads Forms2

## 4. Many pages, one form

For ~50 pages: keep the same **Modal page path** on every CTA. Only change
button text, style, or theme per page. Do not re-author Marketo ID on each page.
