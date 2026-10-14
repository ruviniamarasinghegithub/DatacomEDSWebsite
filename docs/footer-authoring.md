# Footer authoring in DA

Author the shared footer on `/footer`. Page metadata named `footer` can point to
a different footer document. Preview/publish the content separately from code.

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

The default location selector offers New Zealand and Australia. To author custom
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
