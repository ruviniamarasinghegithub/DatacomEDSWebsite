# Article Body | Block

The Article Body block displays article content in a main column with an optional sidebar. The main column supports nested EDS blocks, such as Social Shares Claps Bar. The sidebar can display related industries, related solutions, and a partner display.

## Add the Block

1. Open the article in DA.live.
2. Insert the **Article Body** block where the article body should appear.
3. Add the article content and any nested blocks inside the Article Body table. Content in separate blocks outside the Article Body is not automatically included.
4. Use the first cell of a content row for the main column. Use the second cell for optional sidebar content.

## Content Example

Add regular article content to the first cell. Add a second-cell value when content should appear in the sidebar.

| Main column | Sidebar |
| --- | --- |
| Article text, headings, images, or other content | Optional sidebar content |

The block places the first cell in the left column and the second cell in the right column. Rows used for block settings and tag values are handled separately.

## Nested Block Example

To display the Social Shares Claps Bar inside Article Body, insert its block table inside the first cell of an Article Body content row:

```text
Article Body content row
	First cell:
		social-shares-claps-bar block table
	Second cell:
		Leave empty, or add sidebar content
```

The nested block table's first row contains its block name, `social-shares-claps-bar`. Article Body converts and loads nested block tables during decoration. A Social Shares Claps Bar block authored outside Article Body remains separate and displays as another share bar.

## Sidebar Tags Example

Add tag values as rows in the Article Body table. Separate multiple plain-text values with commas or semicolons. Hyperlinked values are also supported.

| Field | Value |
| --- | --- |
| Industries | Energy, Healthcare |
| Solutions | Cloud, Cyber Security |
| Hide industries tags | false |
| Hide solutions tags | false |

When **Hide industries tags** is `false`, the **Related industries** heading and its tags are shown. Set it to `true` to hide both. **Hide solutions tags** controls the **Related solutions** heading and tags in the same way. Boolean values are case-insensitive.

## Partner Display Example

Place the partner display settings before the `Carousel content` row. The rows after `Carousel content` define partner entries.

| Field | Value |
| --- | --- |
| Show partner display | true |
| Heading | Our partners |
| Auto Play Delay | 5 |
| Enable autoplay | true |
| Carousel Variant | carousel |
| Carousel content | |
| Partner Name | Datacom |
| Image | https://example.com/datacom-logo.png |
| Alternative text for image | Datacom logo |
| Get image alternative text from DAM | false |
| Link URL | https://www.datacom.com |
| Open link in a new | true |
| Partner Name | Microsoft |
| Image | https://example.com/microsoft-logo.png |
| Alternative text for image | Microsoft logo |
| Get image alternative text from DAM | false |
| Link URL | https://www.microsoft.com |
| Open link in a new | true |

Start each partner with a `Partner Name` row, followed by its image, alternative text, DAM alt option, link, and new-tab setting. Repeat `Partner Name` to start another partner. Set `Carousel Variant` to `static` or `carousel`; autoplay applies to the carousel variant.

## Field Reference

| Field | What to enter | Behavior |
| --- | --- | --- |
| Main column | Article content or a nested block table in the first cell | Renders in the left column. |
| Sidebar | Optional content in the second cell | Renders in the right column. |
| `Industries` | Tag text separated by commas or semicolons, or links | Displays under **Related industries** unless hidden. |
| `Solutions` | Tag text separated by commas or semicolons, or links | Displays under **Related solutions** unless hidden. |
| `Hide industries tags` | `true` or `false` | Hides or shows the Related industries heading and tags. |
| `Hide solutions tags` | `true` or `false` | Hides or shows the Related solutions heading and tags. |
| `Show partner display` | `true` or `false` | Enables or disables the partner display. |
| `Heading` | Partner display heading text | Sets the heading above partner logos. |
| `Auto Play Delay` | Number of seconds | Sets the carousel animation duration. |
| `Enable autoplay` | `true` or `false` | Enables the carousel animation when the variant is `carousel`. |
| `Carousel Variant` | `static` or `carousel` | Selects a static partner row or carousel presentation. |
| `Carousel content` | Start of partner field rows | Begins partner entry parsing; put display settings above this row. |
| `Partner Name` | Partner name | Starts a partner entry and provides its accessible name. |
| `Image` | Image URL or image | Sets the partner logo. |
| `Alternative text for image` | Image alternative text | Sets the logo's alt text when DAM alt is disabled. |
| `Get image alternative text from DAM` | `true` or `false` | Retains the image's existing DAM alt text when enabled. |
| `Link URL` | Partner URL | Sets the destination for the logo. |
| `Open link in a new` | `true` or `false` | Opens the partner link in a new tab when enabled. |

## Authoring Notes

- Article Body does not automatically read AEM page taxonomy. Author the industry and solution values in the block table.
- Nested blocks must be authored inside the first cell to render within the main column.
- DA.live nested blocks do not provide AEM's in-page component drag-and-drop experience.
- The clap count endpoint needs an EDS-compatible backend for counts to persist across sessions.
