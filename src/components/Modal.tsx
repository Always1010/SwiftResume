import { useEffect, useRef, type ReactNode } from "react";

export function Modal({ titleId, descriptionId, className = "", onClose, children, waitForOtherModals = false }: {
  titleId: string;
  descriptionId?: string;
  waitForOtherModals?: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    let previousFocus: Element | null = null;
    const open = () => {
      if (!dialog || dialog.open) return;
      if (waitForOtherModals && document.querySelector("dialog[open]")) return;
      previousFocus = document.activeElement;
      dialog.showModal();
    };
    const observer = waitForOtherModals ? new MutationObserver(open) : null;
    observer?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    open();
    return () => {
      observer?.disconnect();
      if (dialog?.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [waitForOtherModals]);
  return <dialog ref={ref} id={`${titleId}-dialog`} className={`workspace-dialog ${className}`} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}
