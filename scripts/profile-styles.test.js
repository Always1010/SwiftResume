import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getResumeTemplatePageClasses } from "../src/templates/registry";

const stylesheet = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("profile information template styles", () => {
  it("uses only the current profile information selectors", () => {
    expect(stylesheet).not.toContain("profile-detail-grid");
    expect(stylesheet).toContain(".profile-info-grid");
    expect(stylesheet).toContain(".profile-info-row > span");
  });

  it("keeps sidebar fields in one wrapping-safe column", () => {
    expect(stylesheet).toContain(".resume-template-sidebar .contact-row, .resume-template-sidebar .profile-info-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; color: white; }");
    expect(stylesheet).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(stylesheet).toContain("overflow-wrap: anywhere");
  });

  it("routes dark-header templates through high-contrast profile styles", () => {
    const templateBases = {
      executive: "executive",
      boardroom: "executive",
      corporate: "executive",
      gentleman: "executive",
      "state-owned": "executive",
      split: "split",
      monochrome: "monochrome",
      poster: "monochrome",
      terminal: "terminal",
      system: "terminal",
      cyber: "terminal",
    };

    for (const [template, base] of Object.entries(templateBases)) {
      expect(getResumeTemplatePageClasses(template)).toContain(`resume-template-${base}`);
    }
    for (const base of ["executive", "split", "monochrome", "terminal"]) {
      expect(stylesheet).toContain(`.resume-template-${base} .profile-info-grid`);
    }
    expect(stylesheet).toContain(".resume-template-executive .contact-row, .resume-template-executive .profile-info-grid { color: white; }");
    expect(stylesheet).toContain(".resume-page.resume-variant-colorblock .profile-info-grid");
  });

  it("preserves specialized profile typography, spacing, borders and capsules", () => {
    for (const base of ["minimal", "developer", "compact", "newspaper", "japanese", "archive", "diplomat"]) {
      expect(stylesheet).toContain(`.resume-template-${base} .profile-info-grid`);
    }
    expect(stylesheet).toContain(".resume-template-ledger .profile-info-row > span");
    expect(stylesheet).toContain(".resume-template-capsule .profile-info-row > span");
    expect(stylesheet).toContain(".resume-editor-canvas .profile-info-grid");
  });
});
