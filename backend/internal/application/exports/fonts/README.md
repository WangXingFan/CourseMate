# Report font

Noto Sans SC (SIL Open Font License, see OFL.txt).
Source: https://github.com/notofonts/noto-cjk/blob/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf

The static regular font is generated at weight 400 using fontTools
`instantiateVariableFont`. It is embedded in the Go binary; PDF generation
subsets the glyphs used by each report. No system fonts or browser are required.
