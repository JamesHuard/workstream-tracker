import React, { useState, useCallback } from 'react';
import type { Goal, Engagement, EngagementStatus } from '../types';
import { suggestEngagement } from '../utils/ai';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: '#313244',
  border: '1px solid #45475a',
  borderRadius: 6,
  color: '#cdd6f4',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#a6adc8',
  marginBottom: 4,
  fontWeight: 500,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Overlay wrapper ──────────────────────────────────────────────────────────

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#1e1e2e',
          border: '1px solid #383858',
          borderRadius: 10,
          padding: 24,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, color: '#cdd6f4' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6c7086',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 18px',
        background: disabled ? '#313244' : '#7c3aed',
        color: disabled ? '#6c7086' : '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px',
        background: '#313244',
        color: '#cdd6f4',
        border: '1px solid #45475a',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

// ─── Strategy Dialog ──────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#4a90d9', '#7b68ee', '#50c878', '#ff6b6b', '#ffa500',
  '#20b2aa', '#da70d6', '#87ceeb',
];

interface StrategyDialogProps {
  initial?: { name: string; color: string };
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}

export function StrategyDialog({ initial, onSave, onClose }: StrategyDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);

  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim(), color);
  };

  return (
    <Overlay title={initial ? 'Edit Strategy' : 'New Strategy'} onClose={onClose}>
      <Field label="Strategy Name">
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="e.g. Go-to-Market"
          autoFocus
        />
      </Field>

      <Field label="Color">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid #cdd6f4' : '3px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none' }}
            title="Custom color"
          />
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={!name.trim()}>Save</PrimaryButton>
      </div>
    </Overlay>
  );
}

// ─── Operation Dialog ─────────────────────────────────────────────────────────

interface OperationDialogProps {
  initial?: { title: string; goals: Goal[] };
  onSave: (title: string, goals: Goal[]) => void;
  onClose: () => void;
}

export function OperationDialog({ initial, onSave, onClose }: OperationDialogProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [goals, setGoals] = useState<Goal[]>(
    initial?.goals ?? [],
  );
  const [goalInput, setGoalInput] = useState('');

  const addGoal = () => {
    if (!goalInput.trim()) return;
    setGoals(g => [
      ...g,
      { id: Math.random().toString(36).slice(2, 10), description: goalInput.trim() },
    ]);
    setGoalInput('');
  };

  const removeGoal = (id: string) => setGoals(g => g.filter(x => x.id !== id));

  const save = () => {
    if (!title.trim()) return;
    onSave(title.trim(), goals);
  };

  return (
    <Overlay title={initial ? 'Edit Operation' : 'New Operation'} onClose={onClose}>
      <Field label="Operation Title">
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Launch Campaign"
          autoFocus
        />
      </Field>

      <Field label="Goals">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGoal()}
            placeholder="Add a goal and press Enter"
          />
          <SecondaryButton onClick={addGoal}>Add</SecondaryButton>
        </div>
        {goals.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {goals.map(g => (
              <li
                key={g.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: '#313244',
                  borderRadius: 6,
                  marginBottom: 4,
                  fontSize: 13,
                  color: '#cdd6f4',
                }}
              >
                <span>{g.description}</span>
                <button
                  onClick={() => removeGoal(g.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f38ba8',
                    cursor: 'pointer',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={!title.trim()}>Save</PrimaryButton>
      </div>
    </Overlay>
  );
}

// ─── Engagement Dialog ────────────────────────────────────────────────────────

interface EngagementDialogProps {
  initial?: Partial<Engagement>;
  operation: { title: string; goals: Goal[] };
  onSave: (data: Omit<Engagement, 'id' | 'operationId'>) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: EngagementStatus[] = ['active', 'blocked', 'completed'];

export function EngagementDialog({
  initial,
  operation,
  onSave,
  onClose,
}: EngagementDialogProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<EngagementStatus>(initial?.status ?? 'active');
  const [goalTargetIds, setGoalTargetIds] = useState<string[]>(
    initial?.goalTargetIds ?? [],
  );
  const [suggesting, setSuggesting] = useState(false);

  const toggleGoal = (id: string) => {
    setGoalTargetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), status, goalTargetIds });
  };

  const suggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const result = await suggestEngagement({
        operationTitle: operation.title,
        goals: operation.goals.map(g => g.description),
        existingEngagements: initial ? [initial.title ?? ''] : [],
      });
      if (result) {
        setTitle(result.title);
        setDescription(result.description);
      } else {
        alert(
          'AI suggestion unavailable.\n\n' +
          'Open public/ai-config.json and set your API key:\n' +
          '• copilot: add "apiKey" (GitHub personal access token with Copilot access)\n' +
          '• openai:  add "apiKey" (OpenAI API key) and set "backend": "openai"\n' +
          '• custom:  set "endpoint" to your Ollama-compatible URL and "backend": "custom"',
        );
      }
    } finally {
      setSuggesting(false);
    }
  }, [operation, initial]);

  return (
    <Overlay title={initial?.title ? 'Edit Engagement' : 'New Engagement'} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={suggest}
          disabled={suggesting}
          style={{
            fontSize: 12,
            background: '#1e3a5f',
            color: '#89b4fa',
            border: '1px solid #1e4a8f',
            borderRadius: 6,
            padding: '5px 12px',
            cursor: suggesting ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {suggesting ? '⏳ Thinking…' : '✨ AI Suggest'}
        </button>
      </div>

      <Field label="Title">
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Engagement title"
          autoFocus
        />
      </Field>

      <Field label="Description">
        <textarea
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </Field>

      <Field label="Status">
        <div style={{ display: 'flex', gap: 8 }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: status === s ? '2px solid #7c3aed' : '2px solid #45475a',
                background: status === s ? '#3b1f6e' : '#313244',
                color: status === s ? '#cdd6f4' : '#a6adc8',
                cursor: 'pointer',
                fontSize: 12,
                textTransform: 'capitalize',
                fontFamily: 'inherit',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      {operation.goals.length > 0 && (
        <Field label="Goal Targets">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {operation.goals.map(g => (
              <label
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#cdd6f4',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={goalTargetIds.includes(g.id)}
                  onChange={() => toggleGoal(g.id)}
                  style={{ accentColor: '#7c3aed', width: 14, height: 14 }}
                />
                {g.description}
              </label>
            ))}
          </div>
        </Field>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={!title.trim()}>Save</PrimaryButton>
      </div>
    </Overlay>
  );
}
