// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createDefaultResume } from "../model/resume";

const mocks = vi.hoisted(() => ({ addFont: vi.fn(), init: vi.fn(), compile: vi.fn() }));
vi.mock("@myriaddreamin/typst.ts", () => ({
  createTypstCompiler: () => ({
    init: mocks.init, compile: mocks.compile, unmapShadow: vi.fn(),
    mapShadow: vi.fn(), addSource: vi.fn(),
  }),
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("loads the bundled font directly and retries initialization after a failed fetch", async () => {
  const font = new Uint8Array([1, 2, 3]);
  const fetchFont = vi.fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValue({ ok: true, arrayBuffer: async () => font.buffer });
  vi.stubGlobal("fetch", fetchFont);
  mocks.init.mockImplementation(async (options) => {
    expect(options.beforeBuild[0]._kind).toBe("fontLoader");
    expect(options.beforeBuild[0]._preloadRemoteFontOptions.assets).toBe(false);
    for (const hook of options.beforeBuild) await hook(undefined, { builder: { add_raw_font: mocks.addFont } });
  });
  mocks.compile.mockResolvedValue({ result: new Uint8Array([37, 80, 68, 70]) });
  const { generateTypstPdf } = await import("./typstPdf");
  const resume = createDefaultResume();
  resume.profile.photo = "";
  await expect(generateTypstPdf(resume)).rejects.toThrow("无法读取内置中文字体");
  await expect(generateTypstPdf(resume)).resolves.toMatchObject({ filename: `${resume.title}.pdf` });
  expect(mocks.init).toHaveBeenCalledTimes(2);
  expect(fetchFont).toHaveBeenLastCalledWith(new URL("./fonts/NotoSansCJKsc-Regular.otf", window.location.href).href);
  expect(mocks.addFont).toHaveBeenCalledWith(font);
});
