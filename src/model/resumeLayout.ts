import type { ResumeProfile } from "./resume";

// Shared by the editable HTML and the PDF layout.
export const PROFILE_LAYOUT = { firstColumnEm: 13, columnGapEm: 1.9, rowGapPx: 5 };

export interface ProfileInfoRow { id: string; left: string; right?: string }

export function profileInfoRows(profile: ResumeProfile): ProfileInfoRow[] {
  const rows: ProfileInfoRow[] = [];
  if (profile.phone || profile.email) {
    rows.push({ id: "contact", left: profile.phone ? `手机：${profile.phone}` : "", right: profile.email ? `邮箱：${profile.email}` : "" });
  }
  const details = profile.details.filter((item) => item.label || item.value);
  const label = (item: ResumeProfile["details"][number]) => item.label ? `${item.label}：${item.value}` : item.value;
  let pending: ProfileInfoRow | undefined;
  const flush = () => { if (pending) rows.push(pending); pending = undefined; };
  for (const detail of details) {
    if (detail.label.trim() === "求职状态") {
      flush();
      rows.push({ id: detail.id, left: label(detail) });
    } else if (["学历", "最高学历"].includes(detail.label.trim())) {
      rows.push({ id: pending?.id ?? detail.id, left: pending?.left ?? "", right: label(detail) });
      pending = undefined;
    } else if (pending) {
      pending.right = label(detail);
      flush();
    } else {
      pending = { id: detail.id, left: label(detail) };
    }
  }
  flush();
  return rows;
}
