import React from 'react';
import type { Engagement, Operation } from '../types';

interface Props {
  engagement: Engagement;
  operation: Operation;
  onContextMenu: (e: React.MouseEvent | React.TouchEvent) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active:    '#89dceb',
  blocked:   '#f38ba8',
  completed: '#a6e3a1',
};

const STATUS_BG: Record<string, string> = {
  active:    'rgba(137,220,235,0.08)',
  blocked:   'rgba(243,139,168,0.08)',
  completed: 'rgba(166,227,161,0.08)',
};

export default function EngagementCard({ engagement, operation, onContextMenu }: Props) {
  const goalNames = engagement.goalTargetIds
    .map(gid => operation.goals.find(g => g.id === gid)?.description)
    .filter(Boolean);

  const color = STATUS_COLORS[engagement.status] ?? '#cdd6f4';
  const bg = STATUS_BG[engagement.status] ?? 'transparent';

  return (
    <div
      onContextMenu={onContextMenu}
      onTouchStart={(e) => {
        // Long-press triggers context menu on touch devices
        const timeout = setTimeout(() => onContextMenu(e), 500);
        const cleanup = () => clearTimeout(timeout);
        e.currentTarget.addEventListener('touchend', cleanup, { once: true });
        e.currentTarget.addEventListener('touchmove', cleanup, { once: true });
      }}
      style={{
        background: bg,
        border: `1px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
        cursor: 'context-menu',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: '#cdd6f4', flex: 1 }}>
          {engagement.title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color,
            flexShrink: 0,
          }}
        >
          {engagement.status}
        </span>
      </div>

      {engagement.description && (
        <p style={{ fontSize: 11, color: '#a6adc8', margin: '4px 0 0', lineHeight: 1.4 }}>
          {engagement.description}
        </p>
      )}

      {goalNames.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {goalNames.map((name, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                background: 'rgba(180,190,254,0.12)',
                color: '#b4befe',
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
