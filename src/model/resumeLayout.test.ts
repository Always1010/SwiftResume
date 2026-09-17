import { describe, expect, it } from "vitest";
import { createDefaultResume } from "./resume";
import { profileInfoRows } from "./resumeLayout";

describe("shared profile rows", () => {
  it("keeps email in the right column when phone is absent and spans an odd final detail", () => {
    const { profile } = createDefaultResume();
    profile.phone = "";
    const rows = profileInfoRows(profile);
    expect(rows[0]).toMatchObject({ left: "", right: `邮箱：${profile.email}` });
    expect(rows[1].right).toBe("学历：本科");
    expect(rows.at(-1)?.right).toBeUndefined();
  });

  it("omits empty rows and preserves custom values without adding an empty label", () => {
    const { profile } = createDefaultResume();
    profile.phone = profile.email = "";
    profile.details = [{ id: "empty", label: "", value: "" }, { id: "site", label: "", value: "example.com" }];
    expect(profileInfoRows(profile)).toEqual([{ id: "site", left: "example.com", right: undefined }]);
  });
});
