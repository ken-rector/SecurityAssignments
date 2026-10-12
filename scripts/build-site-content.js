// Extracts the readable text of each public page into public/site-content.json, so the shared
// AssignPros chat (InternalAdmin_API) can answer from what this site actually says. Runs before
// every build (see "prebuild" in package.json) so the file always matches the deployed pages.
const fs = require('fs');
const path = require('path');

const siteUrl = 'https://securityassignments.com';
const appDir = path.join(__dirname, '..', 'src', 'app');
const outFile = path.join(__dirname, '..', 'public', 'site-content.json');

// Route -> component folder, for the public pages (login and the video manager are staff-only).
const pages = [
  { route: '', title: 'Security Assignments Home', folder: 'home' },
  { route: 'pricing', title: 'Pricing', folder: 'pricing' },
  { route: 'demo-request', title: 'Request a Demo', folder: 'demo-request' },
];

function htmlToText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')                  // Angular bindings have no text at build time
    .replace(/@(if|for|else|switch|case|defer)\b[^{]*\{|\}/g, ' ') // Angular control-flow blocks
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/&trade;/g, 'TM')
    .replace(/&middot;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const content = {
  site: siteUrl,
  pages: pages.map((p) => {
    const file = path.join(appDir, p.folder, `${p.folder}.component.html`);
    return {
      id: p.route || 'home',
      title: p.title,
      url: `${siteUrl}/${p.route}`,
      text: htmlToText(fs.readFileSync(file, 'utf8')),
    };
  }),
};

fs.writeFileSync(outFile, JSON.stringify(content, null, 2));
console.log(`site-content.json: ${content.pages.length} pages, ${content.pages.reduce((n, p) => n + p.text.length, 0)} chars`);
