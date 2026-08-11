# Employer logos

Drop a file here named `<slug>.png` (or `.svg`) and that employer's real logo
appears in the feed permanently.

## Why local files

Five attempts at remote logo services failed:

| Attempt | Result |
|---|---|
| Favicon from the apply URL | Google Forms' globe, Workday's globe — the apply link points at a form host |
| Favicon from a guessed domain | Google **fabricates** a coloured letter tile when it has no icon and serves it 200, so a green "L" appeared on Insomnia Cookies |
| Favicon from a verified domain | Still nothing for target.com |
| Clearbit + unavatar chain | Unverifiable from the build sandbox, still wrong on screen |

The pattern: a service that invents a plausible image cannot be told apart from
one that found a real image. Local files have no such failure mode.

`OrgLogo` tries, in order:

1. `/logos/<slug>.png`
2. `/logos/<slug>.svg`
3. Clearbit, then unavatar (best effort, may 404)
4. The employer's initial on the employer's brand colour

## Getting the files

Fastest source is each brand's own press or newsroom page — most publish a
PNG with a transparent background. Failing that, Wikipedia's article for the
company usually has the mark in the infobox.

Square-ish crops look best; the tile uses `object-fit: contain` so nothing is
distorted, but a very wide wordmark renders small. A square icon mark (the
Target bullseye, the Starbucks siren) beats a horizontal wordmark.

Roughly 128×128 is plenty — the tile renders at 44–54px.

## Filenames

Run `npx tsx` against `allLogoSlugs()` in `lib/jobs/brands.ts` for the current
list, or read the table there directly. The slug is the domain's first label:
`target.com` → `target.png`, `bk.com` → `bk.png`.

Adding a NEW employer is one line in `BRANDS` plus one file here.

## Trademarks

Using a company's logo to identify their own job listing is nominative use and
is what every job board does. Don't restyle, recolour or crop the marks.
