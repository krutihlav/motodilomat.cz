import { describe, expect, it } from 'vitest';
import { RequestBudget } from '../../src/lib/crawl/requestBudget';

describe('RequestBudget', () => {
  it('tracks remaining/exhausted as requests are consumed', () => {
    const budget = new RequestBudget(3);
    expect(budget.remaining).toBe(3);
    expect(budget.exhausted).toBe(false);

    budget.consume();
    budget.consume(2);

    expect(budget.remaining).toBe(0);
    expect(budget.exhausted).toBe(true);
  });

  it('never goes negative when over-consumed', () => {
    const budget = new RequestBudget(1);
    budget.consume(5);
    expect(budget.remaining).toBe(0);
  });

  describe('withReserve', () => {
    it('reports exhausted earlier than the underlying budget, reserving requests for a later step', () => {
      const budget = new RequestBudget(10);
      const reserved = budget.withReserve(3);

      budget.consume(6);
      expect(budget.remaining).toBe(4);
      expect(reserved.remaining).toBe(1);
      expect(reserved.exhausted).toBe(false);

      budget.consume(1);
      expect(reserved.exhausted).toBe(true);
      expect(budget.exhausted).toBe(false);
    });

    it('consume() on the reserved view spends from the same underlying budget', () => {
      const budget = new RequestBudget(10);
      const reserved = budget.withReserve(2);

      reserved.consume(3);

      expect(budget.remaining).toBe(7);
    });
  });
});
