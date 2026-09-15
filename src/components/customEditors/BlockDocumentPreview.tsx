import type { CSSProperties, ReactNode } from "react";
import type { SerializedEditorNode } from "../../model/resume";

type JsonObject = Record<string, unknown>;

const colorMap: Record<string, string> = {
  default: "inherit",
  gray: "#6b7280",
  brown: "#8b5e3c",
  red: "#b42318",
  orange: "#c45a00",
  yellow: "#8a6700",
  green: "#16794b",
  blue: "#2457a7",
  purple: "#7047a3",
  pink: "#a83b73",
};

function inlineStyle(styles: JsonObject | undefined): CSSProperties {
  const family = styles?.fontFamily;
  return {
    fontWeight: styles?.bold ? 700 : typeof styles?.fontWeight === "string" ? styles.fontWeight : undefined,
    fontStyle: styles?.italic ? "italic" : undefined,
    textDecoration: [styles?.underline ? "underline" : "", styles?.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
    color: typeof styles?.textColor === "string" ? colorMap[styles.textColor] ?? styles.textColor : undefined,
    backgroundColor: typeof styles?.backgroundColor === "string" ? colorMap[styles.backgroundColor] ?? styles.backgroundColor : undefined,
    fontSize: typeof styles?.fontSize === "string" ? styles.fontSize : undefined,
    fontFamily: family === "serif" ? '"Noto Serif CJK SC", "Songti SC", SimSun, serif' : family === "mono" ? '"Cascadia Mono", monospace' : family === "sans" ? '"Microsoft YaHei", "PingFang SC", sans-serif' : undefined,
  };
}

function renderInline(content: unknown): ReactNode {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  return content.map((item, index) => {
    if (typeof item === "string") return item;
    if (!item || typeof item !== "object") return null;
    const value = item as JsonObject;
    if (value.type === "link") {
      return <a key={index} href={typeof value.href === "string" ? value.href : undefined}>{renderInline(value.content)}</a>;
    }
    const text = typeof value.text === "string" ? value.text : "";
    return <span key={index} style={inlineStyle(value.styles as JsonObject | undefined)}>{text}</span>;
  });
}

function blockStyle(props: JsonObject): CSSProperties {
  return {
    color: typeof props.textColor === "string" ? colorMap[props.textColor] ?? props.textColor : undefined,
    backgroundColor: typeof props.backgroundColor === "string" && props.backgroundColor !== "default" ? colorMap[props.backgroundColor] ?? props.backgroundColor : undefined,
    textAlign: typeof props.textAlignment === "string" ? props.textAlignment as CSSProperties["textAlign"] : undefined,
  };
}

function renderTable(block: JsonObject): ReactNode {
  const table = block.content as JsonObject | undefined;
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  return (
    <table className="document-preview-table"><tbody>{rows.map((row, rowIndex) => {
      const cells = row && typeof row === "object" && Array.isArray((row as JsonObject).cells) ? (row as JsonObject).cells as unknown[] : [];
      return <tr key={rowIndex}>{cells.map((cell, cellIndex) => {
        const fullCell = cell && typeof cell === "object" && !Array.isArray(cell) && (cell as JsonObject).type === "tableCell" ? cell as JsonObject : null;
        return <td key={cellIndex} colSpan={typeof fullCell?.props === "object" ? Number((fullCell.props as JsonObject).colspan ?? 1) : 1}>{renderInline(fullCell?.content ?? cell)}</td>;
      })}</tr>;
    })}</tbody></table>
  );
}

function BlockView({ block }: { block: JsonObject }) {
  const type = typeof block.type === "string" ? block.type : "paragraph";
  const props = block.props && typeof block.props === "object" ? block.props as JsonObject : {};
  const content = renderInline(block.content);
  let body: ReactNode;
  if (type === "heading") {
    const level = Number(props.level ?? 2);
    body = level === 1 ? <h3>{content}</h3> : level === 2 ? <h4>{content}</h4> : <h5>{content}</h5>;
  } else if (type === "bulletListItem") body = <ul><li>{content}</li></ul>;
  else if (type === "numberedListItem") body = <ol><li>{content}</li></ol>;
  else if (type === "checkListItem") body = <p>{props.checked ? "☑" : "□"} {content}</p>;
  else if (type === "toggleListItem") body = <p>▸ {content}</p>;
  else if (type === "table") body = renderTable(block);
  else if (type === "quote") body = <blockquote>{content}</blockquote>;
  else if (type === "codeBlock") body = <pre>{content}</pre>;
  else if (type === "divider") body = <hr />;
  else if (["image", "video", "audio", "file"].includes(type)) body = <p className="document-preview-media">{typeof props.name === "string" ? props.name : typeof props.caption === "string" ? props.caption : "媒体附件"}</p>;
  else body = <p>{content}</p>;
  const children = Array.isArray(block.children) ? block.children as JsonObject[] : [];
  return <div className={`document-preview-block type-${type}`} style={blockStyle(props)}>{body}{children.length > 0 && <div className="document-preview-children">{children.map((child, index) => <BlockView block={child} key={typeof child.id === "string" ? child.id : index} />)}</div>}</div>;
}

export function BlockDocumentPreview({ blocks, hiddenIds }: { blocks: SerializedEditorNode[]; hiddenIds: string[] }) {
  return <div className="resume-block-document">{blocks.filter((block) => typeof block.id !== "string" || !hiddenIds.includes(block.id)).map((block, index) => <BlockView block={block} key={typeof block.id === "string" ? block.id : index} />)}</div>;
}
