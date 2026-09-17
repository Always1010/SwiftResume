import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "typst-extension-csp",
    transform(code, id) {
      if (!id.endsWith("/typst_ts_web_compiler.mjs")) return;
      const noArgs = "new Function(getStringFromWasm0(arg0, arg1))";
      const withArgs = "new Function(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3))";
      if (!code.includes(noArgs) || !code.includes(withArgs)) throw new Error("Typst wrapper changed; review the CSP adapter before building.");
      return 'import { typstStaticFunction } from "/src/export/typstCsp.ts";\n' + code
        .replace(noArgs, "typstStaticFunction(getStringFromWasm0(arg0, arg1))")
        .replace(withArgs, "typstStaticFunction(getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg0, arg1))");
    },
  }],
  base: "./",
});
