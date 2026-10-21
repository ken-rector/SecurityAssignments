// Ad attribution: which ad or campaign brought the visitor. Captured once, on the first page of the visit
// (ads land on /, /pricing, /scheduling...), and sent with the demo/contact form so InternalAdmin can report
// cost per demo by source, campaign and keyword. Kept in sessionStorage so it survives moving between pages.

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  campaign: string | null;
  keyword: string | null;
  landingPage: string | null;
}

const KEY = 'ap_attribution';

export function captureAttribution(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const get = (name: string) => params.get(name)?.trim() || null;

    // Ad click IDs stand in for UTM tags when an ad was set up without them (auto-tagging).
    const clickSource = get('gclid') ? ['google', 'cpc'] : get('msclkid') ? ['bing', 'cpc'] : get('li_fat_id') ? ['linkedin', 'paid'] : null;
    const utmSource = get('utm_source') ?? clickSource?.[0] ?? null;

    // A new tagged visit replaces the stored one; an untagged page view keeps the original.
    if (!utmSource && sessionStorage.getItem(KEY)) {
      return;
    }

    const attribution: Attribution = {
      utmSource: utmSource ?? (document.referrer ? referrerSource(document.referrer) : null),
      utmMedium: get('utm_medium') ?? clickSource?.[1] ?? (document.referrer ? 'referral' : null),
      campaign: get('utm_campaign'),
      keyword: get('utm_term'),
      landingPage: window.location.href,
    };
    sessionStorage.setItem(KEY, JSON.stringify(attribution));
  } catch {
    // Storage blocked (private mode): the form still sends its own page as the landing page.
  }
}

export function getAttribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) {
      return JSON.parse(stored) as Attribution;
    }
  } catch {
    // fall through
  }
  return { utmSource: null, utmMedium: null, campaign: null, keyword: null, landingPage: window.location.href };
}

// Organic visits: "google" from www.google.com, ignoring our own sites.
function referrerSource(referrer: string): string | null {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/(^|\.)(assignpros|securityassignments)\.com$/i.test(host)) {
      return null;
    }
    const engine = host.match(/(google|bing|yahoo|duckduckgo|linkedin|facebook)\./i);
    return engine ? engine[1].toLowerCase() : host;
  } catch {
    return null;
  }
}
