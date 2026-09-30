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

## Arabic companion (Phase 7)

`noto-kufi-arabic.woff2` — **Noto Kufi Arabic**, SIL Open Font License 1.1
(`OFL-NotoKufiArabic.txt`). Source: `ofl/notokufiarabic/NotoKufiArabic[wght].ttf` from
github.com/google/fonts (version 2.109).

Built with fontTools (reproducible):

1. `fontTools.varLib.instancer`: `wght=400:700`.
2. `pyftsubset --flavor=woff2 --layout-features='*'` with Arabic only: U+0600–06FF,
   U+0750–077F, U+08A0–08FF, U+200C–200F (ZWNJ/ZWJ/LRM/RLM), U+061C, U+2010–2011, U+FD3E–FD3F.

Result ≈ 40 KB, one variable file. Loaded only by the Arabic layout (`app/ar/layout.tsx`) with a
matching `unicode-range`, so Latin text and all figures on Arabic pages stay in Geologica.
Why this face: `docs/ux-benchmark.md` → "Phase 7 — multilingual benchmark".
