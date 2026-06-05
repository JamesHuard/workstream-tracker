import type { AppState, Operation } from '../types';

interface Props {
  operation: Operation;
  state: AppState;
}

export default function StatusSummary({ operation, state }: Props) {
  const engagements = operation.engagementIds
    .map(id => state.engagements[id])
    .filter(Boolean);

  const total = engagements.length;
  const active    = engagements.filter(e => e.status === 'active').length;
  const blocked   = engagements.filter(e => e.status === 'blocked').length;
  const completed = engagements.filter(e => e.status === 'completed').length;

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ padding: '6px 0 8px' }}>
      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: '#313244',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #89dceb, #a6e3a1)',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill label="Active"    count={active}    color="#89dceb" />
        <Pill label="Blocked"   count={blocked}   color="#f38ba8" />
        <Pill label="Done"      count={completed} color="#a6e3a1" />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c7086' }}>
          {total} total
        </span>
      </div>
    </div>
  );
}

function Pill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {count} {label}
    </span>
  );
}
