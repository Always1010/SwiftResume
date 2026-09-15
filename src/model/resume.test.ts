import { describe, expect, it } from "vitest";
import {
  createDefaultResume,
  createSection,
  duplicateSection,
  isResumeDocument,
  moveSection,
  reorderSection,
} from "./resume";

describe("resume model", () => {
  it("creates a usable default document", () => {
    const resume = createDefaultResume();
    expect(isResumeDocument(resume)).toBe(true);
    expect(resume.sections.length).toBeGreaterThan(2);
  });

  it("creates and duplicates independent modules", () => {
    const section = createSection("projects");
    const copy = duplicateSection(section);
    expect(copy.id).not.toBe(section.id);
    expect(copy.items[0].id).not.toBe(section.items[0].id);
  });

  it("moves and drags sections without mutating the input", () => {
    const sections = createDefaultResume().sections;
    const moved = moveSection(sections, sections[0].id, 1);
    expect(moved[1].id).toBe(sections[0].id);
    expect(sections[0].id).not.toBe(moved[0].id);

    const reordered = reorderSection(sections, sections[0].id, sections[2].id);
    expect(reordered[2].id).toBe(sections[0].id);
  });
});
