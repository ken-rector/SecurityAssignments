// Site traffic: one small "page viewed" note to InternalAdmin per page, with the ad/source the visit came
// from (attribution.ts), so Marketing Funnels > Site traffic shows visits next to leads.
// No names, emails or IP addresses: the visitor and the visit are random IDs kept in this browser.

import { environment } from '../environments/environment';
import { getAttribution } from './attribution';

const VISITOR_KEY = 'ap_visitor';
const SESSION_KEY = 'ap_session';
const REFERRER_KEY = 'ap_referrer';

export function trackPageView(path: string): void {
  try {
    // Local development isn't real traffic.
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      return;
    }

    const attribution = getAttribution();
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
      device: device()
    };

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

function storedId(storage: Storage, key: string): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    storage.setItem(key, id);
  }
  return id;
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
