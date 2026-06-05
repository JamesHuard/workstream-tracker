import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import type { AppState } from '../types';
import OperationColumn from './OperationColumn';
import ContextMenu from './ContextMenu';
import { StrategyDialog, OperationDialog } from './EditDialogs';

interface Props {
  strategyId: string;
  state: AppState;
}

export default function StrategyGroup({ strategyId, state }: Props) {
  const { dispatch } = useStore();
  const strategy = state.strategies[strategyId];

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showEditStrategy, setShowEditStrategy] = useState(false);
  const [showAddOp, setShowAddOp] = useState(false);

  const openCtx = useCallback((e: React.MouseEvent) => {
    // Only trigger on the strategy header itself, not on child columns
    if ((e.target as HTMLElement).closest('[data-operation-column]')) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  if (!strategy) return null;

  const ctxItems = [
    { label: '✏️ Edit Strategy', onClick: () => setShowEditStrategy(true) },
    { label: '➕ Add Operation', onClick: () => setShowAddOp(true) },
    {
      label: '🗑️ Delete Strategy',
      danger: true,
      onClick: () => {
        if (
          window.confirm(
            `Delete strategy "${strategy.name}" and all its operations?`,
          )
        ) {
          dispatch({ type: 'DELETE_STRATEGY', id: strategyId });
        }
      },
    },
  ];

  return (
    <>
      <section
        onContextMenu={openCtx}
        style={{
          marginBottom: 32,
        }}
      >
        {/* Strategy header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
            padding: '4px 0',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: strategy.color,
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: strategy.color,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {strategy.name}
          </h2>
          <div style={{ flex: 1, height: 1, background: strategy.color, opacity: 0.25 }} />
          <button
            onClick={() => setShowAddOp(true)}
            title="Add Operation"
            style={{
              background: 'none',
              border: `1px solid ${strategy.color}55`,
              borderRadius: 5,
              color: strategy.color,
              cursor: 'pointer',
              fontSize: 12,
              padding: '3px 10px',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            + Operation
          </button>
        </div>

        {/* Operation columns */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {strategy.operationIds.map(opId => (
            <div key={opId} data-operation-column="">
              <OperationColumn
                operationId={opId}
                state={state}
                strategyColor={strategy.color}
              />
            </div>
          ))}

          {strategy.operationIds.length === 0 && (
            <p style={{ color: '#6c7086', fontSize: 13, margin: 0 }}>
              No operations yet. Right-click or use "+ Operation" to add one.
            </p>
          )}
        </div>
      </section>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {showEditStrategy && (
        <StrategyDialog
          initial={{ name: strategy.name, color: strategy.color }}
          onSave={(name, color) => {
            dispatch({ type: 'UPDATE_STRATEGY', id: strategyId, name, color });
            setShowEditStrategy(false);
          }}
          onClose={() => setShowEditStrategy(false)}
        />
      )}

      {showAddOp && (
        <OperationDialog
          onSave={(title, goals) => {
            dispatch({ type: 'ADD_OPERATION', strategyId, title, goals });
            setShowAddOp(false);
          }}
          onClose={() => setShowAddOp(false)}
        />
      )}
    </>
  );
}
