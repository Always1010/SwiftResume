import { useEffect, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { contentRichTextExtensions } from "../../model/contentRichText";
import type { RichTextDocument } from "../../model/resume";

function ToolbarButton({ editor, command, active, children, title }: {
  editor: Editor;
  command: () => void;
  active?: boolean;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={command}
    >
      {children}
    </button>
  );
}

function changeIndent(editor: Editor, direction: -1 | 1) {
  if (editor.isActive("listItem")) {
    if (direction > 0) editor.chain().focus().sinkListItem("listItem").run();
    else editor.chain().focus().liftListItem("listItem").run();
    return;
  }
  if (!editor.isActive("paragraph")) editor.chain().focus().setParagraph().run();
  const current = Number(editor.getAttributes("paragraph").indent ?? 0);
  const indent = Math.min(6, Math.max(0, current + direction));
  editor.chain().focus().updateAttributes("paragraph", { indent }).run();
}

function ContentToolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("请输入链接地址；留空可移除链接", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  return (
    <div className="content-rich-toolbar" aria-label="富文本格式工具">
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="撤销" command={() => { editor.chain().focus().undo().run(); }}>↶</ToolbarButton>
        <ToolbarButton editor={editor} title="重做" command={() => { editor.chain().focus().redo().run(); }}>↷</ToolbarButton>
        <ToolbarButton editor={editor} title="加粗" active={editor.isActive("bold")} command={() => { editor.chain().focus().toggleBold().run(); }}><strong>B</strong></ToolbarButton>
        <ToolbarButton editor={editor} title="无序列表" active={editor.isActive("bulletList")} command={() => { editor.chain().focus().toggleBulletList().run(); }}>• 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="链接" active={editor.isActive("link")} command={setLink}>链接</ToolbarButton>
      </div>
      <details className="more-format"><summary>更多格式</summary><div className="content-rich-toolbar">
      <label className="toolbar-select">
        <span>段落</span>
        <select
          aria-label="段落类型"
          value={editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p"}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">正文</option><option value="h1">标题 1</option><option value="h2">标题 2</option><option value="h3">标题 3</option>
        </select>
      </label>
      <label className="toolbar-select">
        <span>字号</span>
        <select aria-label="字号" defaultValue="11pt" onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}>
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((size) => <option value={`${size}pt`} key={size}>{size}</option>)}
        </select>
      </label>
      <label className="toolbar-select">
        <span>字体</span>
        <select aria-label="字体" defaultValue="" onChange={(event) => event.target.value ? editor.chain().focus().setFontFamily(event.target.value).run() : editor.chain().focus().unsetFontFamily().run()}>
          <option value="">默认黑体</option>
          <option value="Microsoft YaHei">微软雅黑</option><option value="SimSun">宋体</option><option value="KaiTi">楷体</option><option value="Cascadia Mono">等宽</option>
        </select>
      </label>
      <label className="toolbar-select">
        <span>字重</span>
        <select aria-label="字重" defaultValue="400" onChange={(event) => editor.chain().focus().setMark("textStyle", { fontWeight: event.target.value }).run()}>
          <option value="400">常规</option><option value="500">中等</option><option value="600">半粗</option><option value="700">粗体</option>
        </select>
      </label>
      <label className="toolbar-select">
        <span>行高</span>
        <select aria-label="行高" defaultValue="1.4" onChange={(event) => editor.chain().focus().setLineHeight(event.target.value).run()}>
          <option value="1">1.0</option><option value="1.2">1.2</option><option value="1.4">1.4</option><option value="1.5">1.5</option><option value="1.6">1.6</option><option value="1.8">1.8</option><option value="2">2.0</option>
        </select>
      </label>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="加粗" active={editor.isActive("bold")} command={() => { editor.chain().focus().toggleBold().run(); }}><strong>B</strong></ToolbarButton>
        <ToolbarButton editor={editor} title="斜体" active={editor.isActive("italic")} command={() => { editor.chain().focus().toggleItalic().run(); }}><em>I</em></ToolbarButton>
        <ToolbarButton editor={editor} title="下划线" active={editor.isActive("underline")} command={() => { editor.chain().focus().toggleUnderline().run(); }}><u>U</u></ToolbarButton>
        <ToolbarButton editor={editor} title="删除线" active={editor.isActive("strike")} command={() => { editor.chain().focus().toggleStrike().run(); }}><s>S</s></ToolbarButton>
      </div>
      <label className="toolbar-color" title="文字颜色"><span>A</span><input aria-label="文字颜色" type="color" defaultValue="#303030" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} /></label>
      <label className="toolbar-color" title="背景高亮"><span>▰</span><input aria-label="背景高亮" type="color" defaultValue="#fff3a3" onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()} /></label>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="左对齐" active={editor.isActive({ textAlign: "left" })} command={() => { editor.chain().focus().setTextAlign("left").run(); }}>≡</ToolbarButton>
        <ToolbarButton editor={editor} title="居中" active={editor.isActive({ textAlign: "center" })} command={() => { editor.chain().focus().setTextAlign("center").run(); }}>≣</ToolbarButton>
        <ToolbarButton editor={editor} title="右对齐" active={editor.isActive({ textAlign: "right" })} command={() => { editor.chain().focus().setTextAlign("right").run(); }}>≡</ToolbarButton>
        <ToolbarButton editor={editor} title="两端对齐" active={editor.isActive({ textAlign: "justify" })} command={() => { editor.chain().focus().setTextAlign("justify").run(); }}>☰</ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="无序列表" active={editor.isActive("bulletList")} command={() => { editor.chain().focus().toggleBulletList().run(); }}>• 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="有序列表" active={editor.isActive("orderedList")} command={() => { editor.chain().focus().toggleOrderedList().run(); }}>1. 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="减少缩进" command={() => changeIndent(editor, -1)}>⇤</ToolbarButton>
        <ToolbarButton editor={editor} title="增加缩进" command={() => changeIndent(editor, 1)}>⇥</ToolbarButton>
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
      </div></details>
    </div>
  );
}

export function ContentBodyEditor({ entryId, content, onChange }: {
  entryId: string;
  content: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
}) {
  const editor = useEditor({
    extensions: contentRichTextExtensions,
    content: content as JSONContent,
    editorProps: { attributes: { "aria-label": "富文本正文" } },
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getJSON() as RichTextDocument),
  }, [entryId]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(content)) {
      editor.commands.setContent(content as JSONContent, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;
  return (
    <div className="content-rich-editor">
      <ContentToolbar editor={editor} />
      <EditorContent editor={editor} className="content-rich-surface resume-rich-text" />
    </div>
  );
}
