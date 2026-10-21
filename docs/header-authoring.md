# Header Authoring

Create the shared document at `/language-masters/en/nav` with a two-column table.
Keep `/nav` for pages without a selected region. Merge the
first row and name it **Header**. Do not add a separate field-name header row.

| Header | |
| --- | --- |
| Logo | Insert the logo image or a link to its asset |
| Logo Alt Text | Datacom |
| Region | |

These Title Case labels map to the Header model fields: **Logo** is an optional
image reference, **Logo Alt Text** is its accessible label (default `Datacom`),
and **Region** is optional. Leave **Region** blank in the shared master so each
page supplies its own country. An authored `nz` or `au` overrides the page region and is only appropriate for
an explicitly country-specific header. Leave the logo value empty to use the
`DATACOM` wordmark. Use the
authoring UI to insert an image rather than pasting HTML. Plain asset paths also
work. Keep image references root-relative, such as `/icons/logos/example.svg`.

The Universal Editor model's single-cell rows are also supported in field order:
logo, logoAlt, region. The table can be placed directly on a page as a Header
block; the site-wide header reads its configuration from the selected shared
document.

Page metadata `nav` can select a different shared document, for example
`/au/en/nav` for a country-specific override. Otherwise, regional pages and
Language Master previews select `/language-masters/en/nav`. Region detection
uses valid `region` metadata, then legacy `search-region` metadata, then the URL
country prefix. Non-master pages without a supported region use `/nav`.
Header and footer share this resolution logic in `scripts/regional-content.js`.
Preview and publish the documents separately from the code before deploying.

| Page URL | Default nav document | Default footer document |
| --- | --- | --- |
| /nz/en/discover | /language-masters/en/nav | /language-masters/en/footer |
| /au/en/discover | /language-masters/en/nav | /language-masters/en/footer |
| /language-masters/en/footer | /language-masters/en/nav | /language-masters/en/footer |
| /discover | /nav | /footer |

These defaults assume no region or document metadata overrides. An unprefixed
page such as `/index-copy` with `region: au` uses the master documents with AU
links. Pages under a country prefix do not need repeated nav/footer metadata.
Remove old nav/footer metadata pointing at regional copies when switching to
the master. Explicit overrides continue to take precedence.

Authored values take precedence over page metadata. Empty values fall back to
`logo`, `logo-alt` (or `logoAlt`), and `region` metadata. An unsupported or missing
region falls back to valid region metadata, then a country-prefixed page path,
then `nz`. If the selected nav document is unavailable, the metadata and wordmark
fallbacks still work; the loader does not silently substitute another document.

The logo links to `https://datacom.com/{region}/en`; the search icon links to
`https://datacom.com/{region}/en/search`. Metadata `datacom-origin` can override the
origin. Header height is 72px below 900px and 80px at larger widths.

Optional metadata examples are included as a comment in the shared HTML head.