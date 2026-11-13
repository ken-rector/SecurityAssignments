// Site traffic: one small "page viewed" note to InternalAdmin per page, with the ad/source the visit came
// from (attribution.ts), so Marketing Funnels > Site traffic shows visits next to leads. When the visitor
// leaves or hides a page, a second note says how long the page was actually looked at and how far down
// they scrolled.
// No names, emails or IP addresses are stored: the visitor, the visit and each page view are random IDs
// kept in this browser.
// Ken's own visits: open any page with ?me=1 once in each browser to mark it (?me=0 unmarks). Marked
// browsers are still recorded but hidden on Site traffic by default.

import { environment } from '../environments/environment';
import { getAttribution } from './attribution';

const VISITOR_KEY = 'ap_visitor';
const SESSION_KEY = 'ap_session';
const REFERRER_KEY = 'ap_referrer';
const INTERNAL_KEY = 'ap_internal';

// The page being looked at now.
interface CurrentView {
  id: string;
  activeMs: number;        // visible time before visibleSince
  visibleSince: number | null;
  maxScrollPct: number;
}

let current: CurrentView | null = null;
let listening = false;

export function trackPageView(path: string): void {
  try {
    // Local development isn't real traffic.
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      return;
    }

    listen();
    sendTime();       // the page being left
    rememberInternal();

    const attribution = getAttribution();
    const pageViewId = newId();
    const visit = {
      site: window.location.hostname.replace(/^www\./, ''),
      path: path.split('?')[0].split('#')[0] || '/',
      visitorId: storedId(localStorage, VISITOR_KEY),
      sessionId: storedId(sessionStorage, SESSION_KEY),
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      campaign: attribution.campaign,
      keyword: attribution.keyword,
      landingPage: pathOf(attribution.landingPage),
      referrer: referrerHost(),
      device: device(),
      pageViewId,
      internal: localStorage.getItem(INTERNAL_KEY) === '1'
    };

    current = {
      id: pageViewId,
      activeMs: 0,
      visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
      maxScrollPct: 0
    };
    // A new page starts at the top; measure after it renders.
    setTimeout(measureScroll, 1000);

    fetch(`${environment.apiUrl}api/sitetraffic/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit),
      keepalive: true // still delivered if the visitor clicks away right after
    }).catch(() => { /* tracking must never break the site */ });
  } catch {
    // Storage blocked (private mode) or similar: skip tracking for this page.
  }
}

function listen(): void {
  if (listening) return;
  listening = true;

  document.addEventListener('visibilitychange', () => {
    if (!current) return;
    if (document.visibilityState === 'hidden') {
      sendTime(); // the visitor may never come back to this tab
    } else if (current.visibleSince === null) {
      current.visibleSince = Date.now();
    }
  });
  window.addEventListener('pagehide', () => sendTime());
  window.addEventListener('scroll', measureScroll, { passive: true });
}

// Running total for the current page. Stops the visible clock until the page is shown again; the API keeps
// the largest values, so sending more than once per page is fine.
function sendTime(): void {
  try {
    if (!current) return;
    if (current.visibleSince !== null) {
      current.activeMs += Date.now() - current.visibleSince;
      current.visibleSince = null;
    }
    measureScroll();
    const body = JSON.stringify({
      pageViewId: current.id,
      seconds: Math.round(current.activeMs / 1000),
      scrollPct: current.maxScrollPct
    });
    const url = `${environment.apiUrl}api/sitetraffic/time`;
    // sendBeacon survives the tab closing; a plain string posts as text/plain, so no CORS preflight.
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, body))) {
      fetch(url, { method: 'POST', body, keepalive: true }).catch(() => { /* never break the site */ });
    }
  } catch {
    // never break the site
  }
}

function measureScroll(): void {
  if (!current) return;
  const doc = document.documentElement;
  const height = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  const seen = window.scrollY + window.innerHeight;
  const pct = height > 0 ? Math.min(100, Math.round((seen / height) * 100)) : 100;
  if (pct > current.maxScrollPct) current.maxScrollPct = pct;
}

// ?me=1 marks this browser as Ken's, ?me=0 unmarks it.
function rememberInternal(): void {
  const me = new URLSearchParams(window.location.search).get('me');
  if (me === '1') localStorage.setItem(INTERNAL_KEY, '1');
  if (me === '0') localStorage.removeItem(INTERNAL_KEY);
}

function storedId(storage: Storage, key: string): string {
  let id = storage.getItem(key);
  if (!id) {
    id = newId();
    storage.setItem(key, id);
  }
  return id;
}

function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// The site the visit came from, host only, remembered from the first page of the visit.
function referrerHost(): string | null {
  let host = sessionStorage.getItem(REFERRER_KEY);
  if (host === null) {
    try {
      host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
      if (/(^|\.)(assignpros|securityassignments)\.com$/i.test(host)) {
        host = '';
      }
    } catch {
      host = '';
    }
    sessionStorage.setItem(REFERRER_KEY, host);
  }
  return host || null;
}

function pathOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function device(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}
