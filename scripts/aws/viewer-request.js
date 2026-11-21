// CloudFront Function (cloudfront-js-2.0), viewer request: Cloudflare Pages' routing for the S3 origin
// (docs/DESIGN.md §10). scripts/aws/render.mjs replaces the DATA line with the built site's HTML pages and
// the _redirects rewrites; the result is the CloudFormation template's FunctionCode, byte for byte.
// - a 200 rewrite (`/p/*` -> `/p/`) serves its target;
// - clean URLs: /press serves press.html, / serves index.html, /p/ serves p/index.html;
// - one copy of each page: /press.html, /press/, /index.html and /p/index answer 308 to the clean path;
// - anything else goes to S3 unchanged; a missing object is the distribution's 404 page (status 404).
// /404.html is passed through: it is the distribution's error page.
var DATA = { pages: [], rewrites: [] };

var PAGES = {};
for (var i = 0; i < DATA.pages.length; i++) PAGES[DATA.pages[i]] = true;
var REWRITES = [];
for (var j = 0; j < DATA.rewrites.length; j++) REWRITES.push({ from: new RegExp(DATA.rewrites[j][0]), to: DATA.rewrites[j][1] });

function route(path) {
  if (path.charAt(path.length - 1) === '/') {
    if (PAGES[path + 'index.html']) return { uri: path + 'index.html' };
    if (/\/index\/$/.test(path)) return { location: path.slice(0, -'index/'.length) };
    if (PAGES[path.slice(0, -1) + '.html']) return { location: path.slice(0, -1) };
    return { uri: path };
  }
  if (PAGES[path]) {
    var clean = path.slice(0, -'.html'.length);
    if (/\/index$/.test(clean)) return { location: clean.slice(0, -'index'.length) };
    return { location: clean };
  }
  if (/\/index$/.test(path)) return { location: path.slice(0, -'index'.length) };
  if (PAGES[path + '.html']) return { uri: path + '.html' };
  if (PAGES[path + '/index.html']) return { location: path + '/' };
  return { uri: path };
}

function query(qs) {
  var parts = [];
  for (var name in qs) {
    var values = qs[name].multiValue ? qs[name].multiValue : [qs[name]];
    for (var k = 0; k < values.length; k++) parts.push(values[k].value === '' ? name : name + '=' + values[k].value);
  }
  return parts.length ? '?' + parts.join('&') : '';
}

function handler(event) {
  var request = event.request;
  if (request.uri === '/404.html') return request;
  var path = request.uri;
  for (var r = 0; r < REWRITES.length; r++) {
    if (REWRITES[r].from.test(path)) {
      path = REWRITES[r].to;
      break;
    }
  }
  var target = route(path);
  if (target.location !== undefined) {
    return { statusCode: 308, statusDescription: 'Permanent Redirect', headers: { location: { value: target.location + query(request.querystring) } } };
  }
  request.uri = target.uri;
  return request;
}
