import { expect, it } from "vitest";
import { typstStaticFunction } from "./typstCsp";

it("preserves the compiler's fixed default callbacks without evaluating code", () => {
  expect(typstStaticFunction("return 0")()).toBe(0);
  expect(typstStaticFunction("return true")()).toBe(true);
  expect(typstStaticFunction("return path", "path")("/main.typ")).toBe("/main.typ");
  for (const message of ["Dummy AccessModel, please initialize compiler with withAccessModel()", "Dummy Registry, please initialize compiler with withPackageRegistry()"]) {
    expect(() => typstStaticFunction(`throw new Error('${message}')`)()).toThrow(message);
  }
  expect(() => typstStaticFunction("return globalThis")).toThrow("静态函数适配");
  expect(() => typstStaticFunction("return path", "unexpected")).toThrow("静态函数适配");
});
