import type { AppState, Engagement, Operation, Strategy } from '../types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  blocked: 'Blocked',
  completed: 'Completed',
};

function engagementsForOperation(
  op: Operation,
  state: AppState,
): Engagement[] {
  return op.engagementIds
    .map(id => state.engagements[id])
    .filter(Boolean);
}

function operationBlock(op: Operation, state: AppState): string {
  const engagements = engagementsForOperation(op, state);
  const total = engagements.length;
  const counts = { active: 0, blocked: 0, completed: 0 };
  for (const e of engagements) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
  }

  const lines: string[] = [];
  lines.push(`### Operation: ${op.title}`);
  lines.push('');
  lines.push(
    `**Status**: ${counts.active} active, ${counts.blocked} blocked, ${counts.completed} completed (${total} total)`,
  );
  lines.push('');

  if (op.goals.length > 0) {
    lines.push('#### Goals');
    lines.push('');
    for (const g of op.goals) {
      lines.push(`- ${g.description}`);
    }
    lines.push('');
  }

  if (engagements.length > 0) {
    lines.push('#### Engagements');
    lines.push('');
    lines.push('| Title | Status | Goal Targets | Description |');
    lines.push('|-------|--------|--------------|-------------|');
    for (const e of engagements) {
      const goalNames = e.goalTargetIds
        .map(gid => op.goals.find(g => g.id === gid)?.description ?? gid)
        .join(', ');
      const status = STATUS_LABELS[e.status] ?? e.status;
      const desc = e.description.replace(/\n/g, ' ');
      lines.push(`| ${e.title} | ${status} | ${goalNames} | ${desc} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function strategyBlock(strategy: Strategy, state: AppState): string {
  const lines: string[] = [];
  lines.push(`## Strategy: ${strategy.name}`);
  lines.push('');

  for (const opId of strategy.operationIds) {
    const op = state.operations[opId];
    if (op) {
      lines.push(operationBlock(op, state));
    }
  }

  return lines.join('\n');
}

export function generateMarkdown(state: AppState): string {
  const lines: string[] = [];
  lines.push('# Workstream Tracker');
  lines.push('');
  lines.push(`_Generated: ${new Date().toISOString()}_`);
  lines.push('');

  for (const stratId of state.strategyOrder) {
    const strategy = state.strategies[stratId];
    if (strategy) {
      lines.push(strategyBlock(strategy, state));
    }
  }

  return lines.join('\n');
}

export function downloadMarkdown(state: AppState): void {
  const md = generateMarkdown(state);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workstream-tracker.md';
  a.click();
  URL.revokeObjectURL(url);
}
