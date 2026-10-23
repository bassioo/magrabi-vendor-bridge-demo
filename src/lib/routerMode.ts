// 'browser' (default): clean URLs, needs SPA redirects (Netlify _redirects included).
// 'hash': works on any static host. 'memory': for sandboxed hosted previews where the URL cannot change.
export type RouterMode = 'browser' | 'hash' | 'memory';
const raw = import.meta.env.VITE_ROUTER;
export const ROUTER_MODE: RouterMode = raw === 'hash' || raw === 'memory' ? raw : 'browser';
/** In memory mode new tabs cannot deep-link, so vendor links open in the same tab. */
export const OPEN_LINKS_IN_NEW_TAB = ROUTER_MODE !== 'memory';
export function vendorLink(inviteId: string): string {
  if (ROUTER_MODE === 'hash') return `${window.location.href.split('#')[0]}#/vendor/${inviteId}`;
  if (ROUTER_MODE === 'memory') return `${window.location.origin}/vendor/${inviteId}`;
  return `${window.location.origin}/vendor/${inviteId}`;
}
