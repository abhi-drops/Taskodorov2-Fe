import type { CounterPayload } from '../../types/note'

export function adjustCounterValue(payload: CounterPayload, delta: number): CounterPayload {
  return { ...payload, value: Math.max(0, payload.value + delta) }
}

// Auto-complete only ever sets completed forward, never auto-unsets — a manual
// checkmark toggle always wins after that, per the decision in docs/phase2-roadmap.md.
export function shouldAutoComplete(payload: CounterPayload, alreadyCompleted: boolean): boolean {
  return payload.target != null && payload.value >= payload.target && !alreadyCompleted
}
