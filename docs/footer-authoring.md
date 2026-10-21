# Footer authoring in DA

Author the shared footer on `/language-masters/en/footer`. AU/NZ pages and
Language Master previews load this same document automatically. A supported `region` metadata
value (`au` or `nz`) takes precedence over legacy `search-region` metadata and
the URL country prefix, including on unprefixed pages such as `/index-copy`.
Non-master pages without a supported region use `/footer`. Page metadata named `footer`
overrides this default and can point to a different footer document. Header and
footer use the shared resolver in `scripts/regional-content.js`; country-prefixed
pages do not need repeated nav/footer metadata. Remove old `footer` metadata
pointing at regional copies to use the shared master instead. Country-specific
footers can still be selected with explicit metadata when their content differs.
Preview/publish the master document separately from code before deploying. A missing selected footer is
reported as a loading error rather than silently loading a different footer.

Updating a label in the master updates every page that loads it after the
document is previewed/published and the consuming page is refreshed. There is
no copy or rollout step. Selecting the master is separate from country-specific
URL rewriting: NZ/AU Datacom links use each consuming page's resolved region.
Root-relative non-regional links such as `/discover` are not rewritten.

## Link table

Create a table with a merged header named **Footer Links** (the older **Group**
name also works). Each row has these four cells:

| Footer Links | | | |
| --- | --- | --- | --- |
| Explore more of Datacom | Discover | | /discover |
| Explore more of Datacom | Who we are | | /who-we-are |
| Explore more of Datacom | Our sustainability journey | | /sustainability |
| Explore more of Datacom | Our locations | | /locations |
| Explore more of Datacom | Year in review | | /year-in-review |
| Work with us | Careers at Datacom | | /careers |
| Work with us | Partners | | /partners |
| Work with us | Rainbow Tick | Insert an image in this cell | /partners/rainbow-tick |
| Social | Facebook | | https://www.facebook.com/datacom |
| Social | LinkedIn | | https://www.linkedin.com/company/datacom |
| Social | Twitter | | https://twitter.com/datacom |
| Social | YouTube | | https://www.youtube.com/user/datacom |
| Legal | Privacy policy | | /privacy |
| Legal | GDPR | | /gdpr |
| Legal | Terms of use | | /terms-of-use |
| Legal | Legal | | /legal |
| Legal | Shielded site | Insert an image in this cell | /shielded-site |
| Legal | Copyright © 2026 Datacom | | |

The cells are **Group**, **Link text**, **Icon**, and **Link**, respectively.
Do not insert a second header row with these names. Insert hyperlinks in Link
cells or use plain URLs/page paths. Icon is optional and accepts an inserted
image or DA icon. Insert images with the authoring UI; do not paste HTML into
the cell. External links automatically receive an external-link indicator. A
three-cell format (Group, Link text, Link) also works. Keep the same group name
for rows belonging to the same column, and provide a link label on every row.
Empty separator rows are ignored.

When changing a hyperlink in DA, update its actual destination using the link
editor, not just its displayed URL text. Each Link cell should contain one
complete hyperlink or one plain URL, not several linked URL fragments. Datacom
NZ/AU destinations in the rendered footer are localized to the current page's
country (using `region` metadata before the URL); the raw authoring document
still retains its authored destinations.

Groups appear in first-occurrence order. The first three groups become mobile
accordions with headings; the fourth and later groups become utility columns
without headings, matching the four-column AEM component. Copyright text
beginning with `Copyright` or the copyright symbol is displayed as a paragraph.
The default **Change location** selector is appended to the utility column.

To hide the default location selector on a page, add page metadata
`hide-change-location: true`. A custom **Change location** section in the
footer document takes precedence and supplies the selector's own link choices.
Authored link `id` and `adobe-analytics` attributes are retained.

## Ordinary document content

Existing footers with headings followed by link lists also work. Separate DA
sections become columns, or use a **Columns** table whose cells contain headings
and lists. Content without headings is preserved.

## Location selector

The default location selector offers New Zealand and Australia and preselects
the page's resolved region, including metadata overrides. Without a supported
region it defaults to New Zealand. A custom list without a matching country
uses its first option, so the selector always starts with a selected location
and Continue enabled.

To author custom
locations, use ordinary document content with a heading **Change location**,
an optional description, and a list of linked locations immediately after it.
The authored list replaces the default location choices.

The modal supports keyboard navigation, Escape, selection, and Continue. When
both current and selected URLs have country-prefixed paths, switching locations
preserves the current page path under the selected country.

External links open in a new tab with `noopener noreferrer`. Datacom locale
links are localized for NZ/AU pages. A link titled `shielded-site` or labeled
**Shielded site** enables the existing Shielded Site integration; its ordinary
link remains usable if the integration fails. Loading failures are logged in
the browser console.
