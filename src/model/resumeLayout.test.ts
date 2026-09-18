import { describe, expect, it } from "vitest";
import { createDefaultResume } from "./resume";
import { profileInfoRows } from "./resumeLayout";

describe("shared profile rows", () => {
  it("keeps contact columns fixed and starts an odd detail in the left column", () => {
    const { profile } = createDefaultResume();
    profile.phone = "";
    const rows = profileInfoRows(profile);
    expect(rows[0]).toMatchObject({ left: "", right: `邮箱：${profile.email}` });
    expect(rows[1].left).toBe("学历：本科");
    expect(rows[1]).not.toHaveProperty("right");
    expect(rows.at(-1)?.right).toBeUndefined();
  });

  it("pairs regular details in order and keeps configured full-width details on their own rows", () => {
    const { profile } = createDefaultResume();
    profile.phone = profile.email = "";
    profile.details = [
      { id: "degree", label: "学历", value: "本科" },
      { id: "site", label: "个人网站", value: "example.com" },
      { id: "status", label: "求职状态", value: "在职", fullWidth: true },
      { id: "language", label: "语言", value: "英语" },
    ];
    expect(profileInfoRows(profile)).toEqual([
      { id: "degree", left: "学历：本科", right: "个人网站：example.com" },
      { id: "status", left: "求职状态：在职" },
      { id: "language", left: "语言：英语" },
    ]);
  });

  it("omits empty rows and preserves custom values without adding an empty label", () => {
    const { profile } = createDefaultResume();
    profile.phone = profile.email = "";
    profile.details = [{ id: "empty", label: "", value: "" }, { id: "site", label: "", value: "example.com" }];
    expect(profileInfoRows(profile)).toEqual([{ id: "site", left: "example.com", right: undefined }]);
  });
});
