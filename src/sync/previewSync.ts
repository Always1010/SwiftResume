import { useEffect, useRef } from "react";
import { normalizeResumeDocument, type ResumeDocument } from "../model/resume";

const CHANNEL_NAME = "swift-resume:standalone-preview:v1";

type PreviewMessage =
  | { type: "request-state"; source: string }
  | { type: "state" | "commit"; source: string; resume: ResumeDocument };

export function usePreviewPublisher(resumeId: string, resume: ResumeDocument, ready: boolean, onCommittedResume?: (resume: ResumeDocument) => void) {
  const sourceRef = useRef(crypto.randomUUID());
  const resumeRef = useRef(resume);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onCommittedResumeRef = useRef(onCommittedResume);
  resumeRef.current = resume;
  onCommittedResumeRef.current = onCommittedResume;

  useEffect(() => {
    if (!ready || !resumeId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`${CHANNEL_NAME}:${resumeId}`);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<PreviewMessage>) => {
      const message = event.data;
      if (!message || message.source === sourceRef.current) return;
      if (message.type === "request-state") {
        channel.postMessage({ type: "state", source: sourceRef.current, resume: resumeRef.current } satisfies PreviewMessage);
        return;
      }
      if (message.type !== "commit") return;
      const committed = normalizeResumeDocument(message.resume);
      if (committed) onCommittedResumeRef.current?.(committed);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [ready, resumeId]);

  useEffect(() => {
    if (!ready || !channelRef.current) return;
    channelRef.current.postMessage({ type: "state", source: sourceRef.current, resume } satisfies PreviewMessage);
  }, [ready, resume]);
}

export function usePreviewSubscriber(resumeId: string, onResume: (resume: ResumeDocument) => void) {
  const sourceRef = useRef(crypto.randomUUID());
  const onResumeRef = useRef(onResume);
  const newestUpdateRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  onResumeRef.current = onResume;

  useEffect(() => {
    if (!resumeId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`${CHANNEL_NAME}:${resumeId}`);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<PreviewMessage>) => {
      const message = event.data;
      if (!message || (message.type !== "state" && message.type !== "commit") || message.source === sourceRef.current) return;
      const resume = normalizeResumeDocument(message.resume);
      if (!resume) return;
      const updatedAt = Date.parse(resume.updatedAt) || 0;
      if (updatedAt < newestUpdateRef.current) return;
      newestUpdateRef.current = updatedAt;
      onResumeRef.current(resume);
    };
    channel.postMessage({ type: "request-state", source: sourceRef.current } satisfies PreviewMessage);
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [resumeId]);

  return (resume: ResumeDocument) => {
    const channel = channelRef.current;
    if (!channel) return;
    newestUpdateRef.current = Math.max(newestUpdateRef.current, Date.parse(resume.updatedAt) || 0);
    channel.postMessage({ type: "commit", source: sourceRef.current, resume } satisfies PreviewMessage);
  };
}
