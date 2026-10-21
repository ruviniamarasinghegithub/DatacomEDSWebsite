# Full-Width Banner Authoring

Create one **Full Width Banner** block with these labeled fields:

| Field | Value |
| --- | --- |
| Main Image | Insert the banner image |
| Main Image Alt Text | Describe the image, or leave blank if decorative |
| Logo | Insert the organisation logo, if needed |
| Logo Alt Text | Organisation name |
| Sub Heading | Our partnership |
| Main Heading | Partner name |
| Description | Rich text, including paragraphs, lists, and inline links |
| CTA Button | Add one nested CTA Button component per action |

Use DA's authoring controls to insert images and links; do not paste HTML. The
image alt-text field overrides the asset's alt text. Leave it blank for a
decorative banner image. Logo alt text should identify the organisation.

## CTA Buttons

Each **CTA Button** is a repeatable nested component. Add the settings inside
each button, rather than putting all button settings directly on the banner:

| CTA Button field | Example |
| --- | --- |
| Button Text (Must Not Exceed 40 Characters) * | Contact us 1 |
| Button Link | /contact-us |
| Button Style (Options: Primary, Secondary or Tertiary) | Tertiary |
| Button Theme (Options: White, Dark or Light) | Light |

Repeat the **CTA Button** component to add a second or further button. Each
button is independently decorated by the CTA Button block, so its text limit,
link validation, style, and theme are applied separately. The banner supports
nested CTA tables, existing CTA Button blocks, and nested labeled CTA field rows.

Use the `Primary`, `Secondary`, or `Tertiary` style value and one `White`,
`Dark`, or `Light` theme value for each button. CTA style determines the button
variant; theme determines its background context. On a white or light surface,
the default light styling is used; `Dark` uses the dark-surface CTA styles.

Preview the block at mobile and desktop widths. Check that the image and alt
text are correct, rich text remains readable over the image, both CTAs appear,
and each link opens its intended page.