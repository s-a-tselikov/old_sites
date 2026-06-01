const fs = require('fs');
const path = require('path');

const root = __dirname;

function sanitizeExportHtml(html) {
  return html
    .replace(/ <link rel="dns-prefetch" href="https:\/\/ws\.tildacdn\.com">/g, '')
    .replace(
      / <script src="https:\/\/neo\.tildacdn\.com\/js\/tilda-fallback-1\.0\.min\.js" async charset="utf-8"><\/script>/g,
      ''
    )
    .replace(
      /<div id="rec\d+" class="r t-rec" style=" " data-animationappear="off" data-record-type="131"> <!-- T123 --> <div class="t123"> <div class="t-container_100 "> <div class="t-width t-width_100 "> <!-- nominify begin --> <script src="https:\/\/ticketscloud\.com\/static\/scripts\/widget\/tcwidget\.js"><\/script> <!-- nominify end --> <\/div> <\/div> <\/div> <\/div> /g,
      ''
    )
    .replace(/href="#ticketscloud:[^"]+"/g, 'href="#tickets"')
    .replace(/data-tilda-lazy="yes"/g, 'data-tilda-lazy="no"');
}

function applyTicketScroll(html) {
  return html
    .replace(
      /<a name="tickets" style="font-size:0;"><\/a>/g,
      '<span id="tickets" class="tickets-anchor" aria-hidden="true"></span>'
    )
    .replace(
      '<script src="data/contact-config.js">',
      '<style>#tickets,.tickets-anchor{display:block;height:0;scroll-margin-top:100px;}</style><script src="ticket-scroll.js"></script><script src="data/contact-config.js">'
    );
}

const sources = ['index.html', 'english.html', 'georgian.html', '404.html'];
const ticketScrollPages = new Set(['index.html', 'english.html']);

for (const file of sources) {
  const filePath = path.join(root, file);
  let html = sanitizeExportHtml(fs.readFileSync(filePath, 'utf8'));
  if (ticketScrollPages.has(file)) {
    html = applyTicketScroll(html);
  }
  fs.writeFileSync(filePath, html);
}

const routes = [
  ['index.html', 'ru/index.html'],
  ['english.html', 'eng/index.html'],
  ['georgian.html', 'geo/index.html'],
  ['404.html', 'error404/index.html'],
];

for (const [src, dst] of routes) {
  const srcPath = path.join(root, src);
  const dstPath = path.join(root, dst);
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.copyFileSync(srcPath, dstPath);
  console.log('Prepared', dst);
}
