# Header Authoring

Create a shared document at `/nav` with a two-column table. Merge the first row
and name it **Header**. Do not add a separate field-name header row.

| Header | |
| --- | --- |
| logo | Insert the logo image or a link to its asset |
| logoAlt | Datacom |
| region | nz |

These rows match the supplied Header model: `logo` is an optional image reference,
`logoAlt` is its accessible label (default `Datacom`), and `region` is `nz` or `au`
(default `nz`). Leave the logo value empty to use the `DATACOM` wordmark. Use the
authoring UI to insert an image rather than pasting HTML. Plain asset paths also
work. Keep image references root-relative, such as `/icons/logos/example.svg`.

The Universal Editor model's single-cell rows are also supported in field order:
logo, logoAlt, region. The table can be placed directly on a page as a Header
block; the site-wide header reads its configuration from `/nav`.

Page metadata `nav` can select a different shared document, for example
`/au/en/nav`. Preview and publish that content separately from the code.

Authored values take precedence over page metadata. Empty values fall back to
`logo`, `logo-alt` (or `logoAlt`), and `region` metadata. An unsupported or missing
region falls back to valid region metadata, then a country-prefixed page path,
then `nz`. If `/nav` is unavailable, the metadata and wordmark fallbacks still work.

The logo links to `https://datacom.com/{region}/en`; the search icon links to
`https://datacom.com/{region}/en/search`. Metadata `datacom-origin` can override the
origin. Header height is 72px below 900px and 80px at larger widths.

Optional metadata examples are included as a comment in the shared HTML head.