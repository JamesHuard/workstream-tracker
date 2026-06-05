import React, { useEffect, useRef } from 'react';

interface Props {
  x: number;
  y: number;
  items: { label: string; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 8),
    left: Math.min(x, window.innerWidth - 160),
    zIndex: 9999,
    background: '#1e1e2e',
    border: '1px solid #383858',
    borderRadius: 6,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    minWidth: 160,
    overflow: 'hidden',
    padding: '4px 0',
  };

  return (
    <div ref={ref} style={style} role="menu">
      {items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={() => { item.onClick(); onClose(); }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            color: item.danger ? '#ff6b6b' : '#cdd6f4',
            fontSize: 13,
            fontFamily: 'inherit',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => ((e.target as HTMLElement).style.background = '#313244')}
          onMouseLeave={e => ((e.target as HTMLElement).style.background = 'none')}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
