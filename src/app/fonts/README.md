# Fonts

`geologica-latin-cyrillic.woff2` — **Geologica**, SIL Open Font License 1.1 (`OFL.txt`).
Source: `ofl/geologica/Geologica[CRSV,SHRP,slnt,wght].ttf` from github.com/google/fonts.

Built with fontTools (reproducible):

1. `fontTools.varLib.instancer`: pin `CRSV`, `SHRP`, `slnt` to their defaults; keep `wght` 400–700.
2. `pyftsubset --flavor=woff2 --layout-features='*'` with Latin (U+0000–024F plus common
   punctuation/symbols U+2000–206F, U+20AC, U+2122, U+2212) and Cyrillic (U+0400–045F,
   U+0490–0491, U+04B0–04B1, U+2116 №).

Result ≈ 41 KB, one variable file, `tnum` (tabular figures) retained.

Why this font and why Cyrillic is required: `docs/ux-benchmark.md` → "Typography decision".
The choice is provisional until brand assets are confirmed (open question 14).
