import { useEffect, useRef } from "react";
export function useModalFocus(ref, onClose, busy = false, enabled = true) {
  const latest = useRef({ onClose, busy, enabled });
  latest.current = { onClose, busy, enabled };
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () => [
      ...(ref.current?.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
      ) || []),
    ];
    focusable()[0]?.focus();
    const key = (e) => {
      if (!latest.current.enabled) return;
      if (e.key === "Escape" && !latest.current.busy) {
        e.preventDefault();
        e.stopPropagation();
        latest.current.onClose();
      }
      if (e.key === "Tab") {
        const list = focusable();
        if (!list.length) {
          e.preventDefault();
          return;
        }
        const first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
}
