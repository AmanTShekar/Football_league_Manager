'use client';
import { useState, useRef, useEffect } from 'react';

export default function Select({ value, onChange, options, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const selected = options.find(o => o.value === value);
  const selLabel = selected ? selected.label : (placeholder || 'Select...');

  return (
    <div ref={wrap} className={'csel-wrap ' + (className || '')}>
      <button
        type="button"
        className={'csel-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="csel-label">{selLabel}</span>
        <svg className="csel-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="csel-dropdown" role="listbox" tabIndex={-1}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={'csel-opt' + (opt.value === value ? ' active' : '')}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onMouseDown={e => e.preventDefault()}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
