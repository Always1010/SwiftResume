// Typst 0.7 creates these fixed default access-model callbacks using Function.
// Keep the exact semantics without evaluating strings under Manifest V3 CSP.
// Unknown callbacks fail closed so dependency changes cannot enable evaluation.
export function typstStaticFunction(body: string, argument = ""): (...args: unknown[]) => unknown {
  if (!argument && body === "return 0") return () => 0;
  if (!argument && body === "return true") return () => true;
  if (argument === "path" && body === "return path") return (path) => path;
  for (const message of [
    "Dummy AccessModel, please initialize compiler with withAccessModel()",
    "Dummy Registry, please initialize compiler with withPackageRegistry()",
  ]) {
    if (body === `throw new Error('${message}')`) return () => { throw new Error(message); };
  }
  throw new Error("当前 PDF 编译器需要更新静态函数适配，请使用浏览器打印。");
}
