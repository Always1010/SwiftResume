// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlankResume } from "../model/resume";
import { TemplatePickerDialog } from "./TemplatePickerDialog";

vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("./ResumePreview", () => ({ ResumePreview: () => null }));
vi.mock("./TemplateGallery", () => ({ TemplateGallery: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect("minimal")}>试用极简</button> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root.unmount()); document.body.innerHTML = ""; });

function setup() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const resume = createBlankResume();
  const original = structuredClone(resume);
  const onApply = vi.fn();
  const onClose = vi.fn();
  act(() => root.render(<TemplatePickerDialog resume={resume} onApply={onApply} onClose={onClose} />));
  const click = (text: string) => act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === text)!.click());
  return { resume, original, onApply, onClose, click };
}

describe("template trial", () => {
  it("does not change or save the document when trying and cancelling a template", () => {
    const { resume, original, onApply, onClose, click } = setup();
    click("试用极简");
    click("取消");
    expect(resume).toEqual(original);
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("applies only the selected appearance after explicit confirmation", () => {
    const { resume, onApply, click } = setup();
    click("试用极简");
    expect(onApply).not.toHaveBeenCalled();
    click("应用样式");
    expect(onApply).toHaveBeenCalledExactlyOnceWith({ ...resume.theme, templateId: "minimal" });
  });
});
