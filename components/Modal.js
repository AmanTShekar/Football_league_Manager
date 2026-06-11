'use client';
import { useEffect, useRef } from 'react';

export function Modal({ open, onClose, children, size = 'sm' }) {
  const ref = useRef();
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={'modal-overlay open'} ref={ref} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className={'modal-' + size}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-title">{title}</div>
      <p className="modal-msg">{message}</p>
      <div className="modal-actions">
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm btn-danger" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
      </div>
    </Modal>
  );
}
