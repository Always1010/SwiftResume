import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { createReactStyleSpec } from "@blocknote/react";

const fontFamilies: Record<string, string> = {
  sans: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif',
  serif: '"Noto Serif CJK SC", "Songti SC", SimSun, serif',
  mono: '"Cascadia Mono", "Microsoft YaHei", monospace',
};

const FontSizeStyle = createReactStyleSpec(
  { type: "fontSize", propSchema: "string" },
  { render: ({ value, contentRef }) => <span ref={contentRef} style={{ fontSize: value }} /> },
);

const FontFamilyStyle = createReactStyleSpec(
  { type: "fontFamily", propSchema: "string" },
  { render: ({ value, contentRef }) => <span ref={contentRef} style={{ fontFamily: fontFamilies[value] ?? fontFamilies.sans }} /> },
);

const FontWeightStyle = createReactStyleSpec(
  { type: "fontWeight", propSchema: "string" },
  { render: ({ value, contentRef }) => <span ref={contentRef} style={{ fontWeight: value }} /> },
);

export const resumeBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: {
    ...defaultStyleSpecs,
    fontSize: FontSizeStyle,
    fontFamily: FontFamilyStyle,
    fontWeight: FontWeightStyle,
  },
});

export type ResumeBlock = typeof resumeBlockNoteSchema.Block;
export type ResumePartialBlock = typeof resumeBlockNoteSchema.PartialBlock;

