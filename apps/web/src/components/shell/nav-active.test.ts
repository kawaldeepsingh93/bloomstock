import { isNavActive, normalizePath } from './nav-active';

describe('isNavActive', () => {
  it('marks the exact route as active', () => {
    expect(isNavActive('/scanner', '/scanner')).toBe(true);
    expect(isNavActive('/scanner', '/dashboard')).toBe(false);
  });

  it('ignores a trailing slash and keeps nested stock pages on the parent', () => {
    expect(isNavActive('/ipo/', '/ipo')).toBe(true);
    expect(isNavActive('/stocks/RELIANCE', '/stocks')).toBe(true);
    expect(isNavActive('/trades', '/trade')).toBe(false);
  });

  it('normalizes empty paths', () => {
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/news/')).toBe('/news');
  });
});
