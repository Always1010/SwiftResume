import { useEffect, useRef } from "react";
import type { ResumeDocument } from "../model/resume";
import type { SyncDelay } from "../settings/appSettings";

export interface SyncVersion {
  clock: number;
  clientId: string;
}

type SyncMessage =
  | { type: "request-state"; source: string }
  | { type: "state" | "update"; source: string; version: SyncVersion; resume: ResumeDocument };

const CHANNEL_NAME = "swift-resume:document-sync:v1";

export function compareSyncVersion(left: SyncVersion, right: SyncVersion): number {
  if (left.clock !== right.clock) return left.clock - right.clock;
  return left.clientId.localeCompare(right.clientId);
}

interface UseResumeSyncOptions {
  resume: ResumeDocument;
  ready: boolean;
  enabled: boolean;
  delayMs: SyncDelay;
  onRemoteResume: (resume: ResumeDocument) => void;
  onSync?: () => void;
}

export function useResumeSync({ resume, ready, enabled, delayMs, onRemoteResume, onSync }: UseResumeSyncOptions) {
  const clientIdRef = useRef(crypto.randomUUID());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const resumeRef = useRef(resume);
  const readyRef = useRef(ready);
  const versionRef = useRef<SyncVersion>({ clock: Date.parse(resume.updatedAt) || 0, clientId: clientIdRef.current });
  const lastObservedResumeRef = useRef(resume);
  const applyingRemoteRef = useRef(false);
  const initializedOnceRef = useRef(false);
  const publishTimerRef = useRef<number | null>(null);
  const onRemoteResumeRef = useRef(onRemoteResume);
  const onSyncRef = useRef(onSync);

  resumeRef.current = resume;
  readyRef.current = ready;
  onRemoteResumeRef.current = onRemoteResume;
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!ready || !enabled || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    const baselineClock = Date.parse(resumeRef.current.updatedAt) || 0;
    if (baselineClock > versionRef.current.clock) {
      versionRef.current = { clock: baselineClock, clientId: clientIdRef.current };
    }

    const publishCurrent = (type: "state" | "update") => {
      channel.postMessage({
        type,
        source: clientIdRef.current,
        version: versionRef.current,
        resume: resumeRef.current,
      } satisfies SyncMessage);
    };

    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;
      if (!message || message.source === clientIdRef.current) return;
      if (message.type === "request-state") {
        if (readyRef.current) publishCurrent("state");
        return;
      }
      if (compareSyncVersion(message.version, versionRef.current) <= 0) return;
      versionRef.current = message.version;
      applyingRemoteRef.current = true;
      onRemoteResumeRef.current(message.resume);
      onSyncRef.current?.();
    };

    if (initializedOnceRef.current) {
      channel.postMessage({ type: "request-state", source: clientIdRef.current } satisfies SyncMessage);
      publishCurrent("update");
    } else {
      initializedOnceRef.current = true;
      channel.postMessage({ type: "request-state", source: clientIdRef.current } satisfies SyncMessage);
    }

    return () => {
      channel.close();
      channelRef.current = null;
      if (publishTimerRef.current !== null) window.clearTimeout(publishTimerRef.current);
    };
  }, [enabled, ready]);

  useEffect(() => {
    if (lastObservedResumeRef.current === resume) return;
    lastObservedResumeRef.current = resume;
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    versionRef.current = {
      clock: Math.max(Date.now(), versionRef.current.clock + 1),
      clientId: clientIdRef.current,
    };
    const channel = channelRef.current;
    if (!ready || !enabled || !channel) return;
    if (publishTimerRef.current !== null) window.clearTimeout(publishTimerRef.current);

    const publish = () => {
      channel.postMessage({
        type: "update",
        source: clientIdRef.current,
        version: versionRef.current,
        resume,
      } satisfies SyncMessage);
      onSyncRef.current?.();
    };

    if (delayMs === 0) publish();
    else publishTimerRef.current = window.setTimeout(publish, delayMs);
  }, [delayMs, enabled, ready, resume]);

  return { supported: typeof BroadcastChannel !== "undefined" };
}
