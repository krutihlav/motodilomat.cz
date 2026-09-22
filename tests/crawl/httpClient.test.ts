import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimiter, waitForRateLimit } from '../../src/lib/crawl/httpClient';

describe('waitForRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not delay the first request to a domain', async () => {
    const promise = waitForRateLimit('example.com');
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBeUndefined();
  });

  it('delays a second request to the same domain by ~3s', async () => {
    await waitForRateLimit('example.com');

    let resolved = false;
    const promise = waitForRateLimit('example.com').then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(2_000);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1_000);
    await promise;
    expect(resolved).toBe(true);
  });

  it('does not delay requests to a different domain', async () => {
    await waitForRateLimit('example.com');

    let resolved = false;
    const promise = waitForRateLimit('jiny-shop.example').then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(0);
    await promise;
    expect(resolved).toBe(true);
  });
});
