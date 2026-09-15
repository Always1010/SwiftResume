import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
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

function ContentToolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("请输入链接地址；留空可移除链接", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  return (
    <div className="content-rich-toolbar" aria-label="正文格式工具">
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="撤销" command={() => { editor.chain().focus().undo().run(); }}>↶</ToolbarButton>
        <ToolbarButton editor={editor} title="重做" command={() => { editor.chain().focus().redo().run(); }}>↷</ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="加粗" active={editor.isActive("bold")} command={() => { editor.chain().focus().toggleBold().run(); }}><strong>B</strong></ToolbarButton>
        <ToolbarButton editor={editor} title="斜体" active={editor.isActive("italic")} command={() => { editor.chain().focus().toggleItalic().run(); }}><em>I</em></ToolbarButton>
        <ToolbarButton editor={editor} title="下划线" active={editor.isActive("underline")} command={() => { editor.chain().focus().toggleUnderline().run(); }}><u>U</u></ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="无序列表" active={editor.isActive("bulletList")} command={() => { editor.chain().focus().toggleBulletList().run(); }}>• 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="有序列表" active={editor.isActive("orderedList")} command={() => { editor.chain().focus().toggleOrderedList().run(); }}>1. 列表</ToolbarButton>
        <ToolbarButton editor={editor} title="减少缩进" command={() => { editor.chain().focus().liftListItem("listItem").run(); }}>⇤</ToolbarButton>
        <ToolbarButton editor={editor} title="增加缩进" command={() => { editor.chain().focus().sinkListItem("listItem").run(); }}>⇥</ToolbarButton>
      </div>
      <div className="toolbar-group">
        <ToolbarButton editor={editor} title="链接" active={editor.isActive("link")} command={setLink}>链接</ToolbarButton>
        <ToolbarButton editor={editor} title="清除格式" command={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); }}>清除</ToolbarButton>
      </div>
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
