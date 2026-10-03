import { resumeReducer, type ResumeAction, type ResumeDocument } from "./resume";

const HISTORY_LIMIT = 100;
interface Snapshot { document: ResumeDocument; label: string }
export interface ResumeHistory {
  present: ResumeDocument;
  past: Snapshot[];
  future: Snapshot[];
  group: string | null;
  lastEditAt: number;
  groupStartedAt: number;
}
export type HistoryAction =
  | { type: "edit"; action: ResumeAction; time: number }
  | { type: "reset"; document: ResumeDocument }
  | { type: "undo"; time: number }
  | { type: "redo"; time: number };

export function createResumeHistory(document: ResumeDocument): ResumeHistory {
  return { present: document, past: [], future: [], group: null, lastEditAt: 0, groupStartedAt: 0 };
}

function describeEdit(previous: ResumeDocument, action: ResumeAction): { label: string; group: string | null } {
  switch (action.type) {
    case "replace": return { label: "恢复简历内容", group: null };
    case "update-title": return { label: "修改简历名称", group: "title" };
    case "update-profile": return {
      label: "修改个人信息",
      group: `profile:${Object.keys(action.value).filter((key) => previous.profile[key as keyof typeof previous.profile] !== action.value[key as keyof typeof action.value]).join(",")}`,
    };
    case "update-theme": return { label: "调整简历样式", group: Object.keys(action.value).length === 1 && !("templateId" in action.value) ? `theme:${Object.keys(action.value)[0]}` : null };
    case "set-sections": {
      if (action.value.length < previous.sections.length) return { label: "删除模块", group: null };
      if (action.value.length > previous.sections.length) return { label: "添加模块", group: null };
      if (action.value.some((section, index) => section.id !== previous.sections[index].id)) return { label: "调整模块顺序", group: null };
      const index = action.value.findIndex((section, i) => section !== previous.sections[i]);
      const section = action.value[index];
      const before = previous.sections[index];
      if (!section || !before) return { label: "修改模块", group: null };
      if (section.enabled !== before.enabled) return { label: "显示或隐藏模块", group: null };
      const ids = (value: typeof section) => (value.type === "content" ? value.entries : value.items).map((item) => item.id).join(",");
      if (ids(section) !== ids(before)) return { label: "调整经历条目", group: null };
      return { label: `编辑${section.title || "模块"}`, group: `section:${section.id}` };
    }
  }
}

function sameContent(left: ResumeDocument, right: ResumeDocument) {
  return JSON.stringify({ ...left, updatedAt: "" }) === JSON.stringify({ ...right, updatedAt: "" });
}

function withFreshTimestamp(document: ResumeDocument, current: ResumeDocument, time: number) {
  return { ...document, updatedAt: new Date(Math.max(time, (Date.parse(current.updatedAt) || 0) + 1)).toISOString() };
}

export function resumeHistoryReducer(state: ResumeHistory, action: HistoryAction): ResumeHistory {
  if (action.type === "reset") return createResumeHistory(action.document);
  if (action.type === "undo" || action.type === "redo") {
    const source = action.type === "undo" ? state.past : state.future;
    const snapshot = source.at(-1);
    if (!snapshot) return state;
    const inverse = { document: state.present, label: snapshot.label };
    return {
      ...state,
      present: withFreshTimestamp(snapshot.document, state.present, action.time),
      past: action.type === "undo" ? state.past.slice(0, -1) : [...state.past, inverse].slice(-HISTORY_LIMIT),
      future: action.type === "undo" ? [...state.future, inverse] : state.future.slice(0, -1),
      group: null,
    };
  }
  const next = resumeReducer(state.present, action.action);
  if (sameContent(next, state.present)) return state;
  const { label, group } = describeEdit(state.present, action.action);
  const merge = group !== null && group === state.group && state.future.length === 0
    && action.time - state.lastEditAt < 750 && action.time - state.groupStartedAt < 5000;
  return {
    present: withFreshTimestamp(next, state.present, action.time),
    past: merge ? state.past : [...state.past, { document: state.present, label }].slice(-HISTORY_LIMIT),
    future: [], group, lastEditAt: action.time, groupStartedAt: merge ? state.groupStartedAt : action.time,
  };
}
