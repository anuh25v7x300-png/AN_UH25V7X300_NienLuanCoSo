import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export default function Modal({ title, children, close, footer, className = '' }) {
  const titleId = useId();
  const panel = useRef(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = panel.current;
    const focusable = () => [...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length);
    (root.querySelector('input:not([type="file"]),textarea') || focusable()[0] || root).focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = focusable(), first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); root.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (before?.isConnected) before.focus(); };
  }, []);
  return createPortal(<div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeRef.current(); }}><section ref={panel} className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><header className="modal-heading"><div><p className="eyebrow">TIỆM HOA AN</p><h2 id={titleId}>{title}</h2></div><button type="button" className="icon-button" aria-label="Đóng hộp thoại" onClick={close}><Icon name="close"/></button></header><div className="modal-content-body">{children}</div>{footer && <footer className="modal-actions">{footer}</footer>}</section></div>, document.body);
}
