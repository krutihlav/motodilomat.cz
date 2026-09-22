import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifyNetworkError,
  fetchText,
  fetchWithDiagnostics,
  resetRateLimiter,
  waitForRateLimit,
} from '../../src/lib/crawl/httpClient';

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

describe('classifyNetworkError', () => {
  it('maps AbortError to timeout', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(classifyNetworkError(err)).toBe('timeout');
  });

  it('maps ENOTFOUND/EAI_AGAIN to dns', () => {
    expect(classifyNetworkError({ code: 'ENOTFOUND' })).toBe('dns');
    expect(classifyNetworkError({ code: 'EAI_AGAIN' })).toBe('dns');
    expect(classifyNetworkError({ cause: { code: 'ENOTFOUND' } })).toBe('dns');
  });

  it('maps ETIMEDOUT/ECONNRESET/ECONNREFUSED to timeout', () => {
    expect(classifyNetworkError({ code: 'ETIMEDOUT' })).toBe('timeout');
    expect(classifyNetworkError({ cause: { code: 'ECONNRESET' } })).toBe('timeout');
    expect(classifyNetworkError({ code: 'ECONNREFUSED' })).toBe('timeout');
  });

  it('falls back to other for unrecognized errors', () => {
    expect(classifyNetworkError(new Error('cokoliv jiného'))).toBe('other');
  });
});

describe('fetchWithDiagnostics / fetchText', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok:true with the response on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('hello', { status: 200 })));

    const outcome = await fetchWithDiagnostics('https://example.com');
    expect(outcome).toMatchObject({ ok: true, status: 200, text: 'hello' });
  });

  it('classifies a DNS failure and fetchText collapses it to null', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }),
        ),
    );

    const outcome = await fetchWithDiagnostics('https://nosuchhost.example');
    expect(outcome).toMatchObject({ ok: false, kind: 'dns' });

    resetRateLimiter();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }),
        ),
    );
    await expect(fetchText('https://nosuchhost.example')).resolves.toBeNull();
  });
});
