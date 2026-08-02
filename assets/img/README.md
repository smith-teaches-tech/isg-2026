# Images

This repo is **public** — GitHub Pages requires it on a free plan. Everything
here is world-readable and stays in git history forever.

## Rules

1. **Mock-ups only.** No real student work, no real names, no real Turnitin
   reports with identifying data. Reports shown in the session are constructed
   to match the real ones — same as the Activity 5 excerpt.
2. **Check reuse rights** before committing anything from a publication.
   The Time brain-study image is the open one; if permission isn't clear, put a
   link on the slide instead of the image.
3. **Under 300 KB each.** Run everything through an optimiser. No Git LFS.

## Folders

| Folder | What goes in it |
|---|---|
| `slides/` | Presentation imagery — the Africa map, the muscular brain, Bloom's |
| `reports/` | Constructed Turnitin AI reports, similarity reports, StyleMatch output |
| `ui/` | The QR code, icons, anything chrome-level |

## Naming

`<segment-number>-<short-name>.png` — e.g. `08-turnitin-ai-report.png`,
`14-africa-map.png`. Sorting the folder then gives you the run of show.

## Optimising

```bash
# lossless-ish PNG squeeze
pngquant --quality 65-85 --ext .png --force assets/img/**/*.png

# screenshots are usually better as JPEG
cwebp -q 82 in.png -o out.webp
```
