"""Create browser-print variants without ambiguous radical/ideograph aliases.

Requires fontTools. Original Typst fonts remain unchanged. WOFF uses built-in
zlib compression; regeneration is a development task, not a runtime dependency.
"""
from collections import defaultdict
from pathlib import Path
from fontTools.ttLib import TTFont

directory = Path(__file__).resolve().parents[1] / "public" / "fonts"
for weight in ("Regular", "Bold"):
    font = TTFont(directory / f"NotoSansCJKsc-{weight}.otf")
    aliases = defaultdict(list)
    for codepoint, glyph in font.getBestCmap().items():
        aliases[glyph].append(codepoint)
    # Chromium's PDF writer chooses the first Unicode mapping of a shared glyph.
    # Exclude only radical aliases which also map to an ordinary CJK ideograph.
    excluded = {cp for codes in aliases.values()
                if any(0x3400 <= cp <= 0x9FFF for cp in codes)
                for cp in codes if 0x2E80 <= cp <= 0x2FDF}
    for table in font["cmap"].tables:
        if table.isUnicode():
            for cp in excluded:
                table.cmap.pop(cp, None)
    family = "SwiftResume Browser Sans"
    for record in font["name"].names:
        if record.nameID in (1, 3, 4, 6, 16):
            value = family if record.nameID in (1, 16) else f"{family} {weight}"
            if record.nameID == 6:
                value = f"SwiftResumeBrowserSans-{weight}"
            record.string = value.encode(record.getEncoding())
    cff = font["CFF "]
    cff.cff.fontNames = [f"SwiftResumeBrowserSans-{weight}"]
    cff.cff.topDictIndex[0].FamilyName = family
    cff.cff.topDictIndex[0].FullName = f"{family} {weight}"
    font.flavor = "woff"
    font.save(directory / f"SwiftResumeBrowserSans-{weight}.woff")
    print(f"{weight}: removed {len(excluded)} ambiguous radical mappings")
