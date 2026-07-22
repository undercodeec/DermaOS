import { useEffect, type ReactNode } from "react";
import { Icon } from "./icons";

interface ModalProps {
  title: string;
  wide?: boolean;
  extraWide?: boolean;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
}

export function Modal({ title, wide, extraWide, onClose, children, foot }: ModalProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal${extraWide ? " xwide" : wide ? " wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="mclose" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {foot ? <div className="modal-foot">{foot}</div> : null}
      </div>
    </div>
  );
}
