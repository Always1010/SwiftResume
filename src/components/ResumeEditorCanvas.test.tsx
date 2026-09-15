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

    const render = (selectedId: string) => act(() => root.render(
      <ResumeEditorCanvas
        resume={resume}
        selectedId={selectedId}
        onSelect={() => undefined}
        onProfileChange={() => undefined}
        onSectionChange={() => undefined}
        onDeleteSection={() => undefined}
        onCommit={onCommit}
      />,
    ));

    render("profile");
    act(() => document.querySelector<HTMLElement>("#resume-block-profile")?.click());
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(1);

    act(() => document.querySelector<HTMLElement>(".resume-editor-canvas")?.click());
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(1);
    expect(onCommit).not.toHaveBeenCalled();

    render(section.id);
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(1);
    expect(onCommit).not.toHaveBeenCalled();

    act(() => document.querySelector<HTMLElement>(".resume-editor-scroller")?.click());
    expect(document.querySelectorAll(".resume-editable-block.editing")).toHaveLength(0);
    expect(onCommit).toHaveBeenCalledTimes(1);
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
        onSelect={() => undefined}
        onProfileChange={() => undefined}
        onSectionChange={() => undefined}
        onDeleteSection={() => undefined}
        onCommit={() => undefined}
      />,
    ));

    expect(document.querySelector(`#resume-block-${visibleSection.id}`)).not.toBeNull();
    expect(document.querySelector(`#resume-block-${hiddenSection.id}`)).toBeNull();
  });
});
