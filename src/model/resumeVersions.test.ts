import { expect, it } from "vitest";
import { createDefaultResume } from "./resume";
import { compareVersions, exportRecord, jobVersion } from "./resumeVersions";
it("creates independent targeted versions and freezes the downloaded content", () => {
  const original = createDefaultResume();
  original.lastExport = exportRecord(original, "原简历.pdf");
  const version = jobVersion(original, " A公司 ", " 后端工程师 ", " 内推岗位 ");
  version.profile.phone = "新手机";
  expect(original.profile.phone).not.toBe("新手机");
  expect(version.lastExport).toBeUndefined();
  expect(version.title).toBe("A公司 · 后端工程师");
  expect(version.target?.notes).toBe("内推岗位");
  expect(original.lastExport.snapshot).not.toHaveProperty("lastExport");
  expect(compareVersions(original, version).map((d) => d.label)).toContain("个人信息");
});
it("ignores timestamps and IDs but detects content, hidden modules and formatting", () => {
  const original = createDefaultResume(), changed = structuredClone(original);
  changed.updatedAt = "2026-01-01";
  changed.sections[0].id = "new-id";
  expect(compareVersions(original, changed)).toHaveLength(0);
  changed.sections[0].enabled = false;
  expect(compareVersions(original, changed).map((d) => d.label)).toContain("模块顺序");
});
