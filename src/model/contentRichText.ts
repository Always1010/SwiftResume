import { generateHTML, type Extensions, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { RichTextDocument } from "./resume";
import { sanitizeRichText } from "./richText";

export const contentRichTextExtensions: Extensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
  }),
];

export function renderContentRichText(content: RichTextDocument): string {
  return sanitizeRichText(generateHTML(content as JSONContent, contentRichTextExtensions));
}
