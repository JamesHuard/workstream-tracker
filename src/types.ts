export type EngagementStatus = 'active' | 'blocked' | 'completed';

export interface Goal {
  id: string;
  description: string;
}

export interface Engagement {
  id: string;
  title: string;
  description: string;
  status: EngagementStatus;
  goalTargetIds: string[];
  operationId: string;
}

export interface Operation {
  id: string;
  title: string;
  strategyId: string;
  goals: Goal[];
  engagementIds: string[];
}

export interface Strategy {
  id: string;
  name: string;
  color: string;
  operationIds: string[];
}

export interface AppState {
  strategies: Record<string, Strategy>;
  operations: Record<string, Operation>;
  engagements: Record<string, Engagement>;
  strategyOrder: string[];
}

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'column' | 'engagement' | 'strategy';
  operationId?: string;
  engagementId?: string;
  strategyId?: string;
}

export interface AiConfig {
  backend: string;
  copilot: { model: string };
  custom: { endpoint: string; model: string };
}
