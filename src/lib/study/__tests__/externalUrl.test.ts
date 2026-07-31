import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from '../externalUrl';

describe('safeExternalUrl', () => {
  it('normalizes public http and https pages', () => {
    expect(safeExternalUrl('example.com/path')).toBe('https://example.com/path');
    expect(safeExternalUrl('http://docs.example.com')).toBe('http://docs.example.com/');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://2130706433',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
    'http://10.0.0.8',
    'http://172.20.0.1',
    'http://192.168.1.1',
    'http://router.local',
    'https://user:password@example.com',
  ])('blocks unsafe or private target %s', (url) => {
    expect(safeExternalUrl(url)).toBeNull();
  });
});
