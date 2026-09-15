// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlankResume, createSection } from "../model/resume";
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
