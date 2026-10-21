# Breadcrumb Authoring

Use one shared table named **Breadcrumb (minimal version)** for both NZ and AU
pages. Merge the first row across both columns and author up to four items:

| Breadcrumb (minimal version) | |
| --- | --- |
| Home | Home (link to https://datacom.com/nz/en) |
| First Link | Who we are (link to https://datacom.com/nz/en/about-us/who-we-are) |
| Second Link | Partners (link to https://datacom.com/nz/en/about-us/partners) |
| Current Page | The current page's title |

Insert the hyperlinks using DA's link editor. Their visible labels are Home,
Who we are, and Partners; the parenthetical text above describes their targets.
Keep the current page as plain text. Labels and the breadcrumb hierarchy remain
authored content; the block does not translate labels or choose ancestors for you.

On `/au/en/...` pages, links beginning with `/nz/en` or `/au/en` on Datacom or
the current site are adapted to `/au/en`. On `/nz/en/...` pages, they use `/nz/en`.
The original hostname, remaining path, query parameters, and fragment are kept.
Other external websites, email links, and non-regional paths are unchanged.

Region selection uses the shared resolver in `scripts/regional-content.js`:
valid `region` metadata, then legacy `search-region` metadata, then the URL
country prefix. An unprefixed page with `region: au` therefore uses AU links.
Without a supported region, authored link targets are unchanged.

The older **Breadcrumb (minimal version nz)** and **Breadcrumb (minimal version
au)** names still work; their suffixes no longer need to match the page region.
Only place one breadcrumb table on each page. Keeping two tables renders two
trails; they are not automatically hidden based on their suffix.

For URL-derived breadcrumbs without authored items, the existing navigation
start level, ID, visibility, and shadowing behavior is unchanged. Navigation
document selection now matches the Header: explicit `nav` metadata, otherwise
`/language-masters/en/nav` for regional pages and Language Master previews,
otherwise `/nav` for unprefixed non-master pages without region metadata.

Preview and publish changed content separately from code. Test the same table
on both regional pages and on an unprefixed page with a region metadata override.