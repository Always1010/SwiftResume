import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Highlight } from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import type { CustomSection } from "../../model/resume";
import { sanitizeRichText } from "../../model/richText";

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

const extensions = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  TextStyleKit,
  FontWeight,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TableKit.configure({ table: { resizable: true } }),
];

function ToolbarButton({ editor, command, active, children, title }: {
  editor: Editor;
  command: () => void;
  active?: boolean;
  children: ReactNode;
  title: string;
}) {
  return <button type="button" className={active ? "active" : ""} title={title} onMouseDown={(event) => event.preventDefault()} onClick={command}>{children}</button>;
}

function RichTextToolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("请输入链接地址；留空可移除链接", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };
  return (
    <div className="mature-rich-toolbar" aria-label="富文本格式工具">
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="撤销" command={() => { editor.chain().focus().undo().run(); }}>↶</ToolbarButton>
        <ToolbarButton editor={editor} title="重做" command={() => { editor.chain().focus().redo().run(); }}>↷</ToolbarButton>
      </div>
      <label className="toolbar-select"><span>段落</span><select value={editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p"} onChange={(event) => {
        const value = event.target.value;
        if (value === "p") editor.chain().focus().setParagraph().run();
        else editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
      }}><option value="p">正文</option><option value="h1">标题 1</option><option value="h2">标题 2</option><option value="h3">标题 3</option></select></label>
      <label className="toolbar-select"><span>字号</span><select defaultValue="11pt" onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}>{[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((size) => <option value={`${size}pt`} key={size}>{size}</option>)}</select></label>
      <label className="toolbar-select"><span>字体</span><select defaultValue="Microsoft YaHei" onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}><option value="Microsoft YaHei">微软雅黑</option><option value="SimSun">宋体</option><option value="KaiTi">楷体</option><option value="Cascadia Mono">等宽</option></select></label>
      <label className="toolbar-select"><span>粗细</span><select defaultValue="400" onChange={(event) => editor.chain().focus().setMark("textStyle", { fontWeight: event.target.value }).run()}><option value="400">常规</option><option value="500">中等</option><option value="600">半粗</option><option value="700">粗体</option></select></label>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="加粗" active={editor.isActive("bold")} command={() => { editor.chain().focus().toggleBold().run(); }}><strong>B</strong></ToolbarButton>
        <ToolbarButton editor={editor} title="斜体" active={editor.isActive("italic")} command={() => { editor.chain().focus().toggleItalic().run(); }}><em>I</em></ToolbarButton>
        <ToolbarButton editor={editor} title="下划线" active={editor.isActive("underline")} command={() => { editor.chain().focus().toggleUnderline().run(); }}><u>U</u></ToolbarButton>
        <ToolbarButton editor={editor} title="删除线" active={editor.isActive("strike")} command={() => { editor.chain().focus().toggleStrike().run(); }}><s>S</s></ToolbarButton>
      </div>
      <label className="toolbar-color" title="文字颜色"><span>A</span><input type="color" defaultValue="#29362e" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} /></label>
      <label className="toolbar-color" title="背景高亮"><span>▰</span><input type="color" defaultValue="#fff3a3" onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()} /></label>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="左对齐" active={editor.isActive({ textAlign: "left" })} command={() => { editor.chain().focus().setTextAlign("left").run(); }}>≡</ToolbarButton>
        <ToolbarButton editor={editor} title="居中" active={editor.isActive({ textAlign: "center" })} command={() => { editor.chain().focus().setTextAlign("center").run(); }}>≣</ToolbarButton>
        <ToolbarButton editor={editor} title="右对齐" active={editor.isActive({ textAlign: "right" })} command={() => { editor.chain().focus().setTextAlign("right").run(); }}>≡</ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="无序列表" active={editor.isActive("bulletList")} command={() => { editor.chain().focus().toggleBulletList().run(); }}>• 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="有序列表" active={editor.isActive("orderedList")} command={() => { editor.chain().focus().toggleOrderedList().run(); }}>1. 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="减少缩进" command={() => { editor.chain().focus().liftListItem("listItem").run(); }}>⇤</ToolbarButton>
        <ToolbarButton editor={editor} title="增加缩进" command={() => { editor.chain().focus().sinkListItem("listItem").run(); }}>⇥</ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="引用" active={editor.isActive("blockquote")} command={() => { editor.chain().focus().toggleBlockquote().run(); }}>❝</ToolbarButton>
        <ToolbarButton editor={editor} title="链接" active={editor.isActive("link")} command={setLink}>链接</ToolbarButton>
        <ToolbarButton editor={editor} title="分隔线" command={() => { editor.chain().focus().setHorizontalRule().run(); }}>—</ToolbarButton>
        <ToolbarButton editor={editor} title="清除格式" command={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); }}>清除</ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="插入表格" command={() => { editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run(); }}>插入表格</ToolbarButton>
        <ToolbarButton editor={editor} title="添加行" command={() => { editor.chain().focus().addRowAfter().run(); }}>＋行</ToolbarButton>
        <ToolbarButton editor={editor} title="添加列" command={() => { editor.chain().focus().addColumnAfter().run(); }}>＋列</ToolbarButton>
        <ToolbarButton editor={editor} title="删除表格" command={() => { editor.chain().focus().deleteTable().run(); }}>删表</ToolbarButton>
      </div>
    </div>
  );
}

export function MatureRichTextEditor({ section, onChange }: { section: CustomSection; onChange: (value: CustomSection) => void }) {
  const editor = useEditor({
    extensions,
    content: sanitizeRichText(section.richText),
    onUpdate: ({ editor: activeEditor }) => onChange({ ...section, richText: sanitizeRichText(activeEditor.getHTML()) }),
  }, [section.id]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = sanitizeRichText(section.richText);
    if (editor.getHTML() !== incoming) editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, section.richText]);

  if (!editor) return null;
  return (
    <div className="mature-rich-editor">
      <div className="editor-mode-notice"><strong>富文本</strong><span>使用传统工具栏自由排版，适合长文本以及从 Word、网页粘贴内容。</span></div>
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} className="mature-rich-surface" />
    </div>
  );
}
