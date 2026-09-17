import { useEffect, useRef, useState } from "react";
import type { ResumeDocument } from "../model/resume";
import { getPdfArtifact, pdfContentKey } from "./pdfArtifact";

export function useTypstPreview(resume: ResumeDocument, delay = 350) {
  const key = pdfContentKey(resume);
  const latest = useRef(resume);
  latest.current = resume;
  const [result, setResult] = useState<{ key: string; blob: Blob } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setFailure(null);
      void getPdfArtifact(latest.current).then(({ blob }) => {
        if (active) setResult({ key, blob });
      }).catch((error: unknown) => {
        if (active) setFailure({ key, message: error instanceof Error ? error.message : "PDF 生成失败" });
      });
    }, delay);
    return () => { active = false; window.clearTimeout(timer); };
  }, [key, delay, attempt]);
  return { blob: result?.blob, updating: result?.key !== key, error: failure?.key === key ? failure.message : "", retry: () => setAttempt((value) => value + 1) };
}
