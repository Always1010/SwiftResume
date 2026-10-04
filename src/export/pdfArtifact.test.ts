import { beforeEach, expect, it, vi } from "vitest";
import { createBlankResume } from "../model/resume";

const generate = vi.hoisted(() => vi.fn());
vi.mock("./typstPdf", () => ({ generateTypstPdf: generate }));
beforeEach(() => { vi.resetModules(); generate.mockReset(); });

it("shares exact PDF bytes between preview and export despite metadata changes", async () => {
  const { getPdfArtifact } = await import("./pdfArtifact");
  const blob = new Blob(["pdf"]);
  generate.mockResolvedValue({ blob });
  const resume = createBlankResume();
  const [preview, download] = await Promise.all([
    getPdfArtifact(resume),
    getPdfArtifact({ ...resume, title: "投递版", updatedAt: "later" }),
  ]);
  expect(generate).toHaveBeenCalledOnce();
  expect(preview.blob).toBe(download.blob);
  expect(download.filename).toBe("投递版.pdf");
  await getPdfArtifact({ ...resume, theme: { ...resume.theme, density: 20 } });
  expect(generate).toHaveBeenCalledTimes(2);
});

it("snapshots pending inputs and permits retry after a failed generation", async () => {
  const { getPdfArtifact } = await import("./pdfArtifact");
  generate.mockRejectedValueOnce(new Error("failed")).mockResolvedValue({ blob: new Blob(["retry"]) });
  const resume = createBlankResume();
  const request = getPdfArtifact(resume);
  resume.profile.name = "later edit";
  await expect(request).rejects.toThrow("failed");
  expect(generate.mock.calls[0][0].profile.name).toBe("");
  resume.profile.name = "";
  await expect(getPdfArtifact(resume)).resolves.toHaveProperty("blob");
  expect(generate).toHaveBeenCalledTimes(2);
});

it("isolates A/B and regenerates changed content or styles while sharing each revision's exact bytes", async () => {
  const { getPdfArtifact, pdfContentKey } = await import("./pdfArtifact");
  // A generated-byte stand-in checks artifact identity, not PDF visual fidelity.
  generate.mockImplementation(async (resume) => ({ blob: new Blob([pdfContentKey(resume)]) }));
  const a = createBlankResume(); a.title = "Synthetic A"; a.profile.name = "Alice";
  const b = createBlankResume(); b.title = "Synthetic B"; b.profile.name = "Bob";
  const aPdf = await getPdfArtifact(a);
  const bPdf = await getPdfArtifact(b);
  expect(aPdf.blob).not.toBe(bPdf.blob);
  b.profile.name = "Bob immediate revision";
  b.theme = { ...b.theme, templateId: "minimal", density: 38, accent: "#2573b9" };
  const [editor, template, exported] = await Promise.all([getPdfArtifact(b), getPdfArtifact(b), getPdfArtifact(b)]);
  expect(editor.blob).toBe(template.blob);
  expect(template.blob).toBe(exported.blob);
  expect(exported.blob).not.toBe(bPdf.blob);
  expect(exported.filename).toBe("Synthetic B.pdf");
  expect(generate).toHaveBeenCalledTimes(3);
  expect(generate.mock.calls[2][0]).toEqual(b);
  expect((await getPdfArtifact(a)).blob).toBe(aPdf.blob);
});
