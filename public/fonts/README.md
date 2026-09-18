# 浏览器打印字体

`SwiftResumeBrowserSans-Regular.woff` 和 `SwiftResumeBrowserSans-Bold.woff`
由同目录的 Noto Sans CJK SC 字体生成，沿用 `LICENSE-NOTO-SANS-CJK.txt`
中的 SIL Open Font License 1.1。

修改：更名为 SwiftResume Browser Sans；从 cmap 中排除 U+2E80–U+2FDF
范围内与普通汉字共享字形的部首别名，避免 Chromium PDF 字形反向映射把“工、手、民”等字导出为部首字符。
字形、字重、字宽和排版度量保持原样。真正输入这些部首时由浏览器回退字体显示。
原始 OTF 文件仍用于 Typst，未修改。

重新生成：安装 Python fontTools 后运行 `python scripts/generate-browser-fonts.py`。
