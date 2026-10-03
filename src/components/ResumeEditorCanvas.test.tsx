// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlankResume, createDefaultResume, createSection } from "../model/resume";
import { ResumeEditorCanvas } from "./ResumeEditorCanvas";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<ReturnType<typeof createRoot>> = [];

afterEach(() => {
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  document.body.innerHTML = "";
});

describe("ResumeEditorCanvas", () => {
  it("only closes editing when the gray editor boundary itself is clicked", () => {
    const resume = createBlankResume();
    const section = createSection("education");
    resume.sections = [section];
    const onCommit = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);

    let selectedId = "profile";
    let editingId: string | null = null;
    const render = () => root.render(
      <ResumeEditorCanvas
        resume={resume}
        selectedId={selectedId}
        editingId={editingId}
        onEdit={(id) => {
          if (editingId) onCommit();
          selectedId = id;
          editingId = id;
          render();
        }}
        onCloseEditor={() => {
          if (editingId) onCommit();
          editingId = null;
          render();
        }}
        onProfileChange={() => undefined}
        onSectionChange={() => undefined}
        onDeleteSection={() => undefined}
      />
    );

    act(render);
    act(() => document.querySelector<HTMLElement>("#resume-block-profile")?.click());
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(1);

    act(() => document.querySelector<HTMLElement>(".resume-editor-canvas")?.click());
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(1);
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      if (editingId) onCommit();
      selectedId = section.id;
      editingId = section.id;
      render();
    });
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(1);
    expect(document.querySelector<HTMLElement>(`.resume-editable-block[data-resume-block="${section.id}"]`)?.classList.contains("editing")).toBe(true);
    expect(onCommit).toHaveBeenCalledTimes(1);

    act(() => document.querySelector<HTMLElement>(".resume-editor-scroller")?.click());
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(0);
    expect(onCommit).toHaveBeenCalledTimes(2);
  });

  it("does not render hidden modules on the resume canvas", () => {
    const resume = createBlankResume();
    const visibleSection = createSection("education");
    const hiddenSection = { ...createSection("content"), enabled: false };
    resume.sections = [visibleSection, hiddenSection];
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => root.render(
      <ResumeEditorCanvas
        resume={resume}
        selectedId="profile"
        editingId={null}
        onEdit={() => undefined}
        onCloseEditor={() => undefined}
        onProfileChange={() => undefined}
        onSectionChange={() => undefined}
        onDeleteSection={() => undefined}
      />,
    ));

    expect(document.querySelector(`#resume-block-${visibleSection.id}`)).not.toBeNull();
    expect(document.querySelector(`#resume-block-${hiddenSection.id}`)).toBeNull();
  });
});


function renderKeyboardFixture(editing: "profile" | "education" | "content" | null) {
  const resume = createBlankResume();
  const education = createSection("education");
  const content = createSection("content");
  resume.sections = [education, content];
  const editingId = editing === "education" ? education.id : editing === "content" ? content.id : editing;
  const onEdit = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(<ResumeEditorCanvas resume={resume} selectedId={editingId ?? "profile"} editingId={editingId}
    onEdit={onEdit} onCloseEditor={() => {}} onProfileChange={() => {}} onSectionChange={() => {}} onDeleteSection={() => {}} />));
  return { onEdit, education, content };
}

function keyDown(element: Element, key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  act(() => { element.dispatchEvent(event); });
  return event;
}

it.each(["Enter", " "])("keeps %j keyboard activation on focused view blocks", (key) => {
  const { onEdit, content } = renderKeyboardFixture(null);
  for (const id of ["profile", content.id]) {
    const block = document.getElementById(`resume-block-${id}`)!;
    expect(block.getAttribute("role")).toBe("button");
    expect(block.tabIndex).toBe(0);
    expect(keyDown(block, key).defaultPrevented).toBe(true);
    expect(onEdit).toHaveBeenLastCalledWith(id);
  }
  expect(onEdit).toHaveBeenCalledTimes(2);
});

it.each(["profile", "education"] as const)("does not swallow spaces or Enter in nested %s fields and buttons", (editing) => {
  const { onEdit } = renderKeyboardFixture(editing);
  const controls = document.querySelectorAll(".inline-editor-shell input, .inline-editor-shell textarea, .inline-editor-shell button, .inline-editor-shell select");
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    for (const key of [" ", "Enter"]) expect(keyDown(control, key).defaultPrevented).toBe(false);
  }
  expect(onEdit).not.toHaveBeenCalled();
});

it("does not swallow spaces from the rich-text editor or nested text nodes", () => {
  const { onEdit } = renderKeyboardFixture("content");
  const body = document.querySelector('[contenteditable="true"]')!;
  expect(body).not.toBeNull();
  expect(keyDown(body, " ").defaultPrevented).toBe(false);
  expect(keyDown(body.querySelector("p")!, " ").defaultPrevented).toBe(false);
  expect(onEdit).not.toHaveBeenCalled();
});

it("ignores composition, modifier shortcuts, unrelated keys and nested view targets", () => {
  const { onEdit } = renderKeyboardFixture(null);
  const block = document.getElementById("resume-block-profile")!;
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
    expect(keyDown(block, " ", options).defaultPrevented).toBe(false);
  }
  expect(keyDown(block, "ArrowDown").defaultPrevented).toBe(false);
  expect(keyDown(block.firstElementChild!, "Enter").defaultPrevented).toBe(false);
  expect(onEdit).not.toHaveBeenCalled();
});

it("does not flag the author's content as suspected samples", () => {
  const resume = createDefaultResume();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(<ResumeEditorCanvas resume={resume} selectedId="profile" editingId={null}
    onEdit={() => {}} onCloseEditor={() => {}} onProfileChange={() => {}} onSectionChange={() => {}} onDeleteSection={() => {}} />));
  expect(container.querySelector(".sample-notice")).toBeNull();
  expect(container.textContent).not.toContain("疑似示例内容");
  expect(container.querySelectorAll(".section-block")).toHaveLength(resume.sections.filter((section) => section.enabled).length);
});
