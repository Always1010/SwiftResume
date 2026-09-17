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
    getPdfArtifact({ ...resume, title: "投递版", updatedAt: "later", target: { company: "公司", role: "岗位", notes: "" } }),
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
