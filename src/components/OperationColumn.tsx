import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import type { AppState } from '../types';
import StatusSummary from './StatusSummary';
import EngagementCard from './EngagementCard';
import ContextMenu from './ContextMenu';
import { OperationDialog, EngagementDialog } from './EditDialogs';

interface Props {
  operationId: string;
  state: AppState;
  strategyColor: string;
}

type DialogMode =
  | { kind: 'editOperation' }
  | { kind: 'addEngagement' }
  | { kind: 'editEngagement'; engagementId: string };

export default function OperationColumn({ operationId, state, strategyColor }: Props) {
  const { dispatch } = useStore();
  const operation = state.operations[operationId];

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; engagementId?: string } | null>(null);
  const [dialog, setDialog] = useState<DialogMode | null>(null);

  const closeCtx = useCallback(() => setCtxMenu(null), []);

  const openColumnCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const openEngagementCtx = useCallback(
    (engagementId: string) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      setCtxMenu({ x: clientX, y: clientY, engagementId });
    },
    [],
  );

  if (!operation) return null;

  const columnCtxItems = [
    { label: '✏️ Edit Operation', onClick: () => setDialog({ kind: 'editOperation' }) },
    { label: '➕ Add Engagement', onClick: () => setDialog({ kind: 'addEngagement' }) },
    {
      label: '🗑️ Delete Operation',
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete operation "${operation.title}" and all its engagements?`)) {
          dispatch({ type: 'DELETE_OPERATION', id: operationId });
        }
      },
    },
  ];

  const engCtxItems = ctxMenu?.engagementId
    ? [
        {
          label: '✏️ Edit Engagement',
          onClick: () => setDialog({ kind: 'editEngagement', engagementId: ctxMenu.engagementId! }),
        },
        {
          label: '🗑️ Delete Engagement',
          danger: true,
          onClick: () => {
            if (window.confirm('Delete this engagement?')) {
              dispatch({ type: 'DELETE_ENGAGEMENT', id: ctxMenu.engagementId! });
            }
          },
        },
      ]
    : columnCtxItems;

  return (
    <>
      <div
        onContextMenu={openColumnCtx}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 260,
          minWidth: 260,
          background: '#181825',
          border: '1px solid #313244',
          borderTop: `3px solid ${strategyColor}`,
          borderRadius: 8,
          padding: '12px 14px',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Header */}
        <h3
          style={{
            margin: '0 0 6px',
            fontSize: 14,
            fontWeight: 700,
            color: '#cdd6f4',
            lineHeight: 1.3,
          }}
        >
          {operation.title}
        </h3>

        {/* Status summary */}
        <StatusSummary operation={operation} state={state} />

        {/* Divider */}
        <div style={{ borderTop: '1px solid #313244', margin: '4px 0 10px' }} />

        {/* Engagements */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 40 }}>
          {operation.engagementIds.map(engId => {
            const engagement = state.engagements[engId];
            if (!engagement) return null;
            return (
              <EngagementCard
                key={engId}
                engagement={engagement}
                operation={operation}
                onContextMenu={openEngagementCtx(engId)}
              />
            );
          })}
        </div>

        {/* Add engagement shortcut */}
        <button
          onClick={() => setDialog({ kind: 'addEngagement' })}
          style={{
            marginTop: 8,
            background: 'none',
            border: '1px dashed #45475a',
            borderRadius: 6,
            color: '#6c7086',
            cursor: 'pointer',
            fontSize: 12,
            padding: '6px',
            width: '100%',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.borderColor = '#7c3aed';
            (e.target as HTMLElement).style.color = '#b4befe';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.borderColor = '#45475a';
            (e.target as HTMLElement).style.color = '#6c7086';
          }}
        >
          + Add Engagement
        </button>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={engCtxItems}
          onClose={closeCtx}
        />
      )}

      {/* Dialogs */}
      {dialog?.kind === 'editOperation' && (
        <OperationDialog
          initial={{ title: operation.title, goals: operation.goals }}
          onSave={(title, goals) => {
            dispatch({ type: 'UPDATE_OPERATION', id: operationId, title, goals });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'addEngagement' && (
        <EngagementDialog
          operation={{ title: operation.title, goals: operation.goals }}
          onSave={eng => {
            dispatch({ type: 'ADD_ENGAGEMENT', operationId, engagement: eng });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'editEngagement' && (
        <EngagementDialog
          initial={state.engagements[dialog.engagementId]}
          operation={{ title: operation.title, goals: operation.goals }}
          onSave={eng => {
            dispatch({ type: 'UPDATE_ENGAGEMENT', id: dialog.engagementId, engagement: eng });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
