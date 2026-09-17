// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createBlankResume, type ResumeDocument } from "../model/resume";
import { useTypstPreview } from "./useTypstPreview";
import { getPdfArtifact } from "./pdfArtifact";

vi.mock("./pdfArtifact", () => ({ pdfContentKey: (resume: ResumeDocument) => resume.profile.name, getPdfArtifact: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
let state: ReturnType<typeof useTypstPreview>;
function Probe({ resume }: { resume: ResumeDocument }) { state = useTypstPreview(resume); return null; }
beforeEach(() => { vi.useFakeTimers(); container = document.createElement("div"); root = createRoot(container); vi.clearAllMocks(); });
afterEach(() => { act(() => root.unmount()); vi.useRealTimers(); });

it("debounces typing and never replaces the latest PDF with an older completion", async () => {
  const pending: ((value: { blob: Blob; filename: string }) => void)[] = [];
  vi.mocked(getPdfArtifact).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
  const resume = createBlankResume();
  act(() => root.render(<Probe resume={resume} />));
  act(() => root.render(<Probe resume={{ ...resume, profile: { ...resume.profile, name: "A" } }} />));
  await act(async () => vi.advanceTimersByTimeAsync(350));
  expect(getPdfArtifact).toHaveBeenCalledTimes(1);
  act(() => root.render(<Probe resume={{ ...resume, profile: { ...resume.profile, name: "B" } }} />));
  await act(async () => vi.advanceTimersByTimeAsync(350));
  const latest = new Blob(["B"]);
  await act(async () => pending[1]({ blob: latest, filename: "B.pdf" }));
  await act(async () => pending[0]({ blob: new Blob(["A"]), filename: "A.pdf" }));
  expect(state.blob).toBe(latest);
  expect(state.updating).toBe(false);
});

it("retains the last successful page and reports failed updates explicitly", async () => {
  const blob = new Blob(["old"]);
  vi.mocked(getPdfArtifact).mockResolvedValueOnce({ blob, filename: "old.pdf" }).mockRejectedValue(new Error("font unavailable"));
  const resume = createBlankResume();
  act(() => root.render(<Probe resume={resume} />));
  await act(async () => vi.advanceTimersByTimeAsync(350));
  act(() => root.render(<Probe resume={{ ...resume, profile: { ...resume.profile, name: "B" } }} />));
  expect(state.blob).toBe(blob);
  expect(state.updating).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(350));
  expect(state.error).toBe("font unavailable");
  expect(state.blob).toBe(blob);
});
