import { Extension, generateHTML, type Extensions, type JSONContent } from "@tiptap/core";
import { Highlight } from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import type { RichTextDocument } from "./resume";
import { sanitizeRichText } from "./richText";

const FontWeight = Extension.create({
  name: "fontWeight",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontWeight: {
          default: null,
          parseHTML: (element) => element.style.fontWeight || null,
          renderHTML: (attributes) => attributes.fontWeight ? { style: `font-weight: ${attributes.fontWeight}` } : {},
        },
      },
    }];
  },
});

const ParagraphIndent = Extension.create({
  name: "paragraphIndent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => {
            const value = Number(element.dataset.indent ?? 0);
            return Number.isFinite(value) ? Math.min(6, Math.max(0, value)) : 0;
          },
          renderHTML: (attributes) => {
            const indent = Number(attributes.indent ?? 0);
            return indent > 0 ? { "data-indent": String(indent), style: `margin-left: ${indent * 2}em` } : {};
          },
        },
      },
    }];
  },
});

export const contentRichTextExtensions: Extensions = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  TextStyleKit,
  FontWeight,
  ParagraphIndent,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TableKit.configure({ table: { resizable: true } }),
];

export function renderContentRichText(content: RichTextDocument): string {
  return sanitizeRichText(generateHTML(content as JSONContent, contentRichTextExtensions));
}
