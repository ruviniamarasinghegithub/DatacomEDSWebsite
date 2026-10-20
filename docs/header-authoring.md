# Header Authoring

Create regional shared documents at `/nz/en/nav` and `/au/en/nav` with a
two-column table. Keep `/nav` for pages without a selected region. Merge the
first row and name it **Header**. Do not add a separate field-name header row.

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
block; the site-wide header reads its configuration from the selected shared
document.

Page metadata `nav` can select a different shared document, for example
`/au/en/nav`. Otherwise, the header automatically selects `/au/en/nav` or
`/nz/en/nav` using valid `region` metadata, then legacy `search-region` metadata,
then the URL country prefix. Without a supported region it uses `/nav`.
Header and footer share this resolution logic in `scripts/regional-content.js`.
Preview and publish the documents separately from the code before deploying.

| Page URL | Default nav document | Default footer document |
| --- | --- | --- |
| /nz/en/discover | /nz/en/nav | /nz/en/footer |
| /au/en/discover | /au/en/nav | /au/en/footer |
| /discover | /nav | /footer |

These defaults assume no region or document metadata overrides. An unprefixed
page such as `/index-copy` with `region: au` uses AU documents automatically.
Pages under a country prefix no longer need repeated nav/footer metadata.

Authored values take precedence over page metadata. Empty values fall back to
`logo`, `logo-alt` (or `logoAlt`), and `region` metadata. An unsupported or missing
region falls back to valid region metadata, then a country-prefixed page path,
then `nz`. If the selected nav document is unavailable, the metadata and wordmark
fallbacks still work; the loader does not silently substitute another document.

The logo links to `https://datacom.com/{region}/en`; the search icon links to
`https://datacom.com/{region}/en/search`. Metadata `datacom-origin` can override the
origin. Header height is 72px below 900px and 80px at larger widths.

Optional metadata examples are included as a comment in the shared HTML head.