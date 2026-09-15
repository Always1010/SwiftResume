import { useCallback, useEffect, useMemo, useRef } from "react";
import { zh } from "@blocknote/core/locales";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu, SideMenuExtension } from "@blocknote/core/extensions";
import {
  BasicTextStyleButton,
  BlockColorsItem,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  DragHandleButton,
  DragHandleMenu,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  TextAlignButton,
  UnnestBlockButton,
  getDefaultReactSlashMenuItems,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import type { CustomSection, SerializedEditorNode } from "../../model/resume";
import { resumeBlockNoteSchema, type ResumeBlock, type ResumePartialBlock } from "./blockNoteSchema";

function cloneWithoutIds(block: ResumeBlock): ResumePartialBlock {
  const copy = structuredClone(block) as unknown as Record<string, unknown>;
  delete copy.id;
  if (Array.isArray(copy.children)) {
    copy.children = copy.children.map((child) => cloneWithoutIds(child as ResumeBlock));
  }
  return copy as ResumePartialBlock;
}

function DocumentDragMenu({
  hiddenIds,
  onToggleHidden,
}: {
  hiddenIds: string[];
  onToggleHidden: (id: string) => void;
}) {
  const editor = useBlockNoteEditor<typeof resumeBlockNoteSchema.blockSchema, typeof resumeBlockNoteSchema.inlineContentSchema, typeof resumeBlockNoteSchema.styleSchema>();
  const components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, { selector: (state) => state?.block as ResumeBlock | undefined });
  if (!block) return null;
  return (
    <DragHandleMenu>
      <components.Generic.Menu.Item onClick={() => editor.insertBlocks([cloneWithoutIds(block)], block, "after")}>
        复制内容块
      </components.Generic.Menu.Item>
      <components.Generic.Menu.Item onClick={() => onToggleHidden(block.id)}>
        {hiddenIds.includes(block.id) ? "显示在简历中" : "从简历中隐藏"}
      </components.Generic.Menu.Item>
      <BlockColorsItem>颜色</BlockColorsItem>
      <RemoveBlockItem>删除内容块</RemoveBlockItem>
    </DragHandleMenu>
  );
}

function DocumentFormattingToolbar() {
  const editor = useBlockNoteEditor<typeof resumeBlockNoteSchema.blockSchema, typeof resumeBlockNoteSchema.inlineContentSchema, typeof resumeBlockNoteSchema.styleSchema>();
  const setStyle = (style: Record<string, string>) => editor.addStyles(style as never);
  return (
    <FormattingToolbar>
      <BlockTypeSelect key="block-type" />
      <BasicTextStyleButton basicTextStyle="bold" key="bold" />
      <BasicTextStyleButton basicTextStyle="italic" key="italic" />
      <BasicTextStyleButton basicTextStyle="underline" key="underline" />
      <BasicTextStyleButton basicTextStyle="strike" key="strike" />
      <label className="blocknote-toolbar-select" title="字号">
        <span>字号</span>
        <select defaultValue="11pt" onChange={(event) => setStyle({ fontSize: event.target.value })}>
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((size) => <option value={`${size}pt`} key={size}>{size}</option>)}
        </select>
      </label>
      <label className="blocknote-toolbar-select" title="字体">
        <span>字体</span>
        <select defaultValue="sans" onChange={(event) => setStyle({ fontFamily: event.target.value })}>
          <option value="sans">黑体</option>
          <option value="serif">宋体</option>
          <option value="mono">等宽</option>
        </select>
      </label>
      <label className="blocknote-toolbar-select" title="字重">
        <span>粗细</span>
        <select defaultValue="400" onChange={(event) => setStyle({ fontWeight: event.target.value })}>
          <option value="400">常规</option>
          <option value="500">中等</option>
          <option value="600">半粗</option>
          <option value="700">粗体</option>
        </select>
      </label>
      <TextAlignButton textAlignment="left" key="left" />
      <TextAlignButton textAlignment="center" key="center" />
      <TextAlignButton textAlignment="right" key="right" />
      <ColorStyleButton key="color" />
      <NestBlockButton key="nest" />
      <UnnestBlockButton key="unnest" />
      <CreateLinkButton key="link" />
    </FormattingToolbar>
  );
}

export function FreeDocumentEditor({ section, onChange }: { section: CustomSection; onChange: (value: CustomSection) => void }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const initialContent = (section.documentBlocks.length ? section.documentBlocks : [{ type: "paragraph", content: "" }]) as ResumePartialBlock[];
  const editor = useCreateBlockNote({
    schema: resumeBlockNoteSchema,
    dictionary: zh,
    initialContent,
    tables: { splitCells: true, cellBackgroundColor: true, cellTextColor: true, headers: true },
  }, [section.id]);

  useEffect(() => {
    const current = JSON.stringify(editor.document);
    const incoming = JSON.stringify(section.documentBlocks);
    if (section.documentBlocks.length && current !== incoming) {
      editor.replaceBlocks(editor.document, section.documentBlocks as ResumePartialBlock[]);
    }
  }, [editor, section.documentBlocks]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      shellRef.current?.querySelectorAll<HTMLElement>("[data-id]").forEach((element) => {
        element.classList.toggle("document-block-hidden", section.hiddenDocumentBlockIds.includes(element.dataset.id ?? ""));
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editor, section.documentBlocks, section.hiddenDocumentBlockIds]);

  const emitChange = useCallback(() => {
    const blocks = structuredClone(editor.document) as unknown as SerializedEditorNode[];
    if (JSON.stringify(blocks) !== JSON.stringify(section.documentBlocks)) onChange({ ...section, documentBlocks: blocks });
  }, [editor, onChange, section]);

  const toggleHidden = useCallback((id: string) => {
    const hiddenDocumentBlockIds = section.hiddenDocumentBlockIds.includes(id)
      ? section.hiddenDocumentBlockIds.filter((item) => item !== id)
      : [...section.hiddenDocumentBlockIds, id];
    onChange({ ...section, hiddenDocumentBlockIds });
  }, [onChange, section]);

  const DragMenu = useCallback(() => (
    <DocumentDragMenu hiddenIds={section.hiddenDocumentBlockIds} onToggleHidden={toggleHidden} />
  ), [section.hiddenDocumentBlockIds, toggleHidden]);

  const slashItems = useMemo(() => async (query: string) => filterSuggestionItems([
    {
      title: "标题日期行",
      subtext: "左右排列标题和日期",
      aliases: ["标题", "日期", "title", "date"],
      group: "简历组件",
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
        type: "table",
        content: { type: "tableContent", columnWidths: [420, 160], rows: [{ cells: ["标题", "日期"] }] },
      }),
    },
    {
      title: "键值字段",
      subtext: "插入可分别排版的 Key / Value",
      aliases: ["字段", "键值", "key", "value"],
      group: "简历组件",
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
        type: "table",
        content: { type: "tableContent", columnWidths: [170, 410], rows: [{ cells: ["字段名称", "字段内容"] }, { cells: ["字段名称", "字段内容"] }] },
      }),
    },
    {
      title: "双栏内容",
      subtext: "插入双列表格，稳定进入预览和导出",
      aliases: ["双栏", "两栏", "columns"],
      group: "简历组件",
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
        type: "table",
        content: { type: "tableContent", columnWidths: [290, 290], rows: [{ cells: ["左栏内容", "右栏内容"] }] },
      }),
    },
    ...getDefaultReactSlashMenuItems(editor).filter((item) => !["图片", "视频", "音频", "文件"].includes(item.title)),
  ], query), [editor]);

  return (
    <div className="free-document-editor" ref={shellRef}>
      <div className="editor-mode-notice"><strong>自由文档</strong><span>直接输入，输入 / 插入标题、列表、表格和简历组件；拖动左侧手柄调整顺序。</span></div>
      <BlockNoteView editor={editor} onChange={emitChange} formattingToolbar={false} slashMenu={false} sideMenu={false}>
        <FormattingToolbarController formattingToolbar={DocumentFormattingToolbar} />
        <SuggestionMenuController triggerCharacter="/" getItems={slashItems} />
        <SideMenuController sideMenu={(props) => <SideMenu {...props} dragHandleMenu={DragMenu}><DragHandleButton {...props} /></SideMenu>} />
      </BlockNoteView>
    </div>
  );
}
