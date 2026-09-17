// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { generateTypstPdf } from "../export/typstPdf";
import { capturePreviews } from "./TemplateThumbnailCapture";

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "mock-worker.mjs" }));
vi.mock("pdfjs-dist", () => ({ getDocument: vi.fn(), PDFWorker: vi.fn() }));
vi.mock("../export/typstPdf", () => ({ generateTypstPdf: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("identifies the template and compilation stage when an asset fetch fails", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobs: [{ kind: "template", id: "heritage" }] }) })
    .mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);
  vi.mocked(generateTypstPdf).mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(capturePreviews("test", vi.fn())).rejects.toThrow("[template:heritage / 编译 Typst PDF（含字体与头像读取）] Failed to fetch");
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
    type: "error", job: { kind: "template", id: "heritage" }, stage: "编译 Typst PDF（含字体与头像读取）",
  });
});

it("preserves the original failure if sending diagnostics also fails", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobs: [{ kind: "template", id: "classic" }] }) })
    .mockRejectedValue(new Error("server disconnected")));
  vi.mocked(generateTypstPdf).mockRejectedValueOnce(new Error("font request interrupted"));
  await expect(capturePreviews("test", vi.fn())).rejects.toThrow("[template:classic / 编译 Typst PDF（含字体与头像读取）] font request interrupted");
});
