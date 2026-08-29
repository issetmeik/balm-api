import { describe, it, expect } from 'vitest';
import {
  ROUTE_TRANSITIONS,
  STOP_TRANSITIONS,
  canTransition,
  terminalStates,
} from './state-machines';
import { ROLE_PERMISSIONS, PERMISSIONS } from './permissions';

describe('máquinas de estado', () => {
  it('rota: transições válidas e inválidas', () => {
    expect(canTransition(ROUTE_TRANSITIONS, 'DRAFT', 'PLANNED')).toBe(true);
    expect(canTransition(ROUTE_TRANSITIONS, 'DRAFT', 'IN_PROGRESS')).toBe(false);
    expect(canTransition(ROUTE_TRANSITIONS, 'COMPLETED', 'IN_PROGRESS')).toBe(false);
  });

  it('rota: COMPLETED e CANCELED são terminais', () => {
    expect(terminalStates(ROUTE_TRANSITIONS).sort()).toEqual(['CANCELED', 'COMPLETED']);
  });

  it('parada: terminais', () => {
    expect(terminalStates(STOP_TRANSITIONS).sort()).toEqual([
      'CANCELED',
      'COMPLETED',
      'FAILED',
      'SKIPPED',
    ]);
  });
});

describe('permissões', () => {
  it('todo papel só concede permissões que existem na lista canônica', () => {
    const set = new Set<string>(PERMISSIONS);
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const p of perms) {
        expect(set.has(p), `${role} -> ${p}`).toBe(true);
      }
    }
  });
});
