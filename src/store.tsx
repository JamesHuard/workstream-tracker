/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import type { AppState, Engagement, Operation, Goal } from './types';
import { saveState } from './utils/storage';

// ─── helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STRATEGY_COLORS = [
  '#4a90d9', '#7b68ee', '#50c878', '#ff6b6b', '#ffa500',
  '#20b2aa', '#da70d6', '#87ceeb',
];
let colorIndex = 0;
function nextColor(): string {
  return STRATEGY_COLORS[colorIndex++ % STRATEGY_COLORS.length];
}

// ─── initial state ───────────────────────────────────────────────────────────

export const EMPTY_STATE: AppState = {
  strategies: {},
  operations: {},
  engagements: {},
  strategyOrder: [],
};

// ─── actions ─────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'ADD_STRATEGY'; name: string; color?: string }
  | { type: 'UPDATE_STRATEGY'; id: string; name: string; color: string }
  | { type: 'DELETE_STRATEGY'; id: string }
  | { type: 'ADD_OPERATION'; strategyId: string; title: string; goals?: Goal[] }
  | { type: 'UPDATE_OPERATION'; id: string; title: string; goals: Goal[] }
  | { type: 'DELETE_OPERATION'; id: string }
  | { type: 'ADD_ENGAGEMENT'; operationId: string; engagement: Omit<Engagement, 'id' | 'operationId'> }
  | { type: 'UPDATE_ENGAGEMENT'; id: string; engagement: Partial<Omit<Engagement, 'id' | 'operationId'>> }
  | { type: 'DELETE_ENGAGEMENT'; id: string }
  | { type: 'LOAD_STATE'; state: AppState };

// ─── reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state;

    case 'ADD_STRATEGY': {
      const id = uid();
      return {
        ...state,
        strategies: {
          ...state.strategies,
          [id]: {
            id,
            name: action.name,
            color: action.color ?? nextColor(),
            operationIds: [],
          },
        },
        strategyOrder: [...state.strategyOrder, id],
      };
    }

    case 'UPDATE_STRATEGY':
      return {
        ...state,
        strategies: {
          ...state.strategies,
          [action.id]: {
            ...state.strategies[action.id],
            name: action.name,
            color: action.color,
          },
        },
      };

    case 'DELETE_STRATEGY': {
      const strategy = state.strategies[action.id];
      if (!strategy) return state;
      const newOperations = { ...state.operations };
      const newEngagements = { ...state.engagements };
      for (const opId of strategy.operationIds) {
        const op = newOperations[opId];
        if (op) {
          for (const engId of op.engagementIds) delete newEngagements[engId];
          delete newOperations[opId];
        }
      }
      const newStrategies = { ...state.strategies };
      delete newStrategies[action.id];
      return {
        ...state,
        strategies: newStrategies,
        operations: newOperations,
        engagements: newEngagements,
        strategyOrder: state.strategyOrder.filter(id => id !== action.id),
      };
    }

    case 'ADD_OPERATION': {
      const id = uid();
      const op: Operation = {
        id,
        title: action.title,
        strategyId: action.strategyId,
        goals: action.goals ?? [],
        engagementIds: [],
      };
      return {
        ...state,
        operations: { ...state.operations, [id]: op },
        strategies: {
          ...state.strategies,
          [action.strategyId]: {
            ...state.strategies[action.strategyId],
            operationIds: [...state.strategies[action.strategyId].operationIds, id],
          },
        },
      };
    }

    case 'UPDATE_OPERATION':
      return {
        ...state,
        operations: {
          ...state.operations,
          [action.id]: {
            ...state.operations[action.id],
            title: action.title,
            goals: action.goals,
          },
        },
      };

    case 'DELETE_OPERATION': {
      const op = state.operations[action.id];
      if (!op) return state;
      const newEngagements = { ...state.engagements };
      for (const engId of op.engagementIds) delete newEngagements[engId];
      const newOperations = { ...state.operations };
      delete newOperations[action.id];
      return {
        ...state,
        operations: newOperations,
        engagements: newEngagements,
        strategies: {
          ...state.strategies,
          [op.strategyId]: {
            ...state.strategies[op.strategyId],
            operationIds: state.strategies[op.strategyId].operationIds.filter(
              id => id !== action.id,
            ),
          },
        },
      };
    }

    case 'ADD_ENGAGEMENT': {
      const id = uid();
      const eng: Engagement = { id, operationId: action.operationId, ...action.engagement };
      return {
        ...state,
        engagements: { ...state.engagements, [id]: eng },
        operations: {
          ...state.operations,
          [action.operationId]: {
            ...state.operations[action.operationId],
            engagementIds: [...state.operations[action.operationId].engagementIds, id],
          },
        },
      };
    }

    case 'UPDATE_ENGAGEMENT':
      return {
        ...state,
        engagements: {
          ...state.engagements,
          [action.id]: { ...state.engagements[action.id], ...action.engagement },
        },
      };

    case 'DELETE_ENGAGEMENT': {
      const eng = state.engagements[action.id];
      if (!eng) return state;
      const newEngagements = { ...state.engagements };
      delete newEngagements[action.id];
      return {
        ...state,
        engagements: newEngagements,
        operations: {
          ...state.operations,
          [eng.operationId]: {
            ...state.operations[eng.operationId],
            engagementIds: state.operations[eng.operationId].engagementIds.filter(
              id => id !== action.id,
            ),
          },
        },
      };
    }

    default:
      return state;
  }
}

// ─── context ─────────────────────────────────────────────────────────────────

interface StoreContext {
  state: AppState;
  dispatch: (action: Action) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Store = createContext<StoreContext | null>(null);

const HISTORY_LIMIT = 100;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, EMPTY_STATE);
  const historyRef = useRef<AppState[]>([]);
  // Use state (not just a ref) so canUndo/canRedo re-render correctly
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [historyLen, setHistoryLen] = useState(0);
  const isUndoRedoRef = useRef(false);

  // Capture snapshots after every state change that is NOT an undo/redo
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const newHistory = historyRef.current.slice(0, historyIdx + 1);
    newHistory.push(state);
    if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
    historyRef.current = newHistory;
    const newIdx = newHistory.length - 1;
    setHistoryIdx(newIdx);
    setHistoryLen(newHistory.length);
    saveState(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const dispatch = useCallback(
    (action: Action) => rawDispatch(action),
    [rawDispatch],
  );

  const undo = useCallback(() => {
    setHistoryIdx(idx => {
      if (idx <= 0) return idx;
      const newIdx = idx - 1;
      const prev = historyRef.current[newIdx];
      isUndoRedoRef.current = true;
      rawDispatch({ type: 'LOAD_STATE', state: prev });
      saveState(prev);
      return newIdx;
    });
  }, [rawDispatch]);

  const redo = useCallback(() => {
    setHistoryIdx(idx => {
      if (idx >= historyRef.current.length - 1) return idx;
      const newIdx = idx + 1;
      const next = historyRef.current[newIdx];
      isUndoRedoRef.current = true;
      rawDispatch({ type: 'LOAD_STATE', state: next });
      saveState(next);
      return newIdx;
    });
  }, [rawDispatch]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < historyLen - 1;

  return (
    <Store.Provider value={{ state, dispatch, undo, redo, canUndo, canRedo }}>
      {children}
    </Store.Provider>
  );
}

export function useStore(): StoreContext {
  const ctx = useContext(Store);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
