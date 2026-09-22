export function normalizePath(path: string): string {
  if (!path) return '/';
  const trimmed = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return trimmed || '/';
}

export function isNavActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  return current === target || current.startsWith(`${target}/`);
}
