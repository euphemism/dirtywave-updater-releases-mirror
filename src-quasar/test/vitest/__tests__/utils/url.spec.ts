import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFirmwareDownloadLink, buildGitHubApiFetchArgs } from 'src/utils/url';

describe('url utils', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('getFirmwareDownloadLink returns url when fetch ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 200 }))));
    const url = await getFirmwareDownloadLink('1.2.3');
    expect(url).toMatch(/M8Firmware_V1_2_3\.zip$/);
  });

  it('getFirmwareDownloadLink trims trailing letter when first fetch fails', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (typeof Request !== 'undefined' && input instanceof Request)
              ? input.url
              : ((input as { url?: string }).url ?? '');
      calls.push(url);
      if (url.includes('V1_2_3A.zip')) {
        return Promise.resolve(new Response('not found', { status: 404 }));
      }
      return Promise.resolve(new Response('', { status: 200 }));
    }));

    const url = await getFirmwareDownloadLink('1.2.3A');
    expect(url).toMatch(/M8Firmware_V1_2_3\.zip$/);
    expect(calls.some(u => u.includes('V1_2_3A.zip'))).toBe(true);
    expect(calls.some(u => u.includes('V1_2_3.zip'))).toBe(true);
  });

  it('buildGitHubApiFetchArgs builds headers and respects token when present', async () => {
    const original = process.env.GITHUB_API_TOKEN;
    try {
      delete process.env.GITHUB_API_TOKEN;
      let [url, init] = await buildGitHubApiFetchArgs('https://api.github.com/test');
      expect(url).toBe('https://api.github.com/test');
      if (!init) throw new Error('init expected');
      expect((init.headers as Record<string, string>)['Accept']).toMatch(/github/);
      expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();

      process.env.GITHUB_API_TOKEN = 'secret';
      ;[url, init] = await buildGitHubApiFetchArgs('https://api.github.com/test2');
      if (!init) throw new Error('init expected');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    } finally {
      process.env.GITHUB_API_TOKEN = original;
    }
  });
});

