// Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
// SPDX-License-Identifier: LicenseRef-Proprietary
// HTML to PDF kit for every language: Chromium shapes and bidi-orders Arabic and other complex scripts itself;
// the shipped fonts are loaded by absolute file URL. The kit handles mechanics (fonts, direction, page chrome,
// fitting) and offers content blocks; the composition is the author's. API: see SKILL.md. Strings passed to the
// helpers are HTML (write &amp; for &, <b> for bold).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { pathToFileURL } = require('url');

const FONTS = path.join(__dirname, '..', 'fonts');
const ICON_FILE = path.join(__dirname, '..', 'icons', 'icons.json'); // Lucide line icons (ISC), see skills/icons/LICENSE.txt
let ICONS = null;
const MIRROR = ['arrow-right']; // icons that point along the reading direction flip in right-to-left documents
function iconSvg(name, cls = '') {
  ICONS = ICONS || JSON.parse(fs.readFileSync(ICON_FILE, 'utf8'));
  if (!ICONS[name]) throw new Error(`unknown icon "${name}": ${Object.keys(ICONS).join(' ')}`);
  return `<svg class="ic${MIRROR.includes(name) ? ' flip' : ''}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
const PAGE = '<!--PAGE-->';
const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'ku', 'sd', 'yi', 'dv'];
const DISPLAY = 'InstrumentSerif'; // one-weight display serif: titles are set at weight 400, never faux-bolded
// Ready-made colour sets; there is no default, the author picks one or passes their own tokens.
// chrome: none | rule | band | side (page decoration in the margins)
const NEUTRAL = { ink: '#1C1C1E', muted: '#6B6B70', tint: '#F1F1EF', rule: '#DCDCD8', paper: '#FFFFFF', chrome: 'none' };
const THEMES = {
  persimmon: { accent: '#D4471F', ink: '#201A17', muted: '#7A6C63', tint: '#F4EEE6', rule: '#E3D9CD', paper: '#FCFAF6', chrome: 'none' },
  indigo: { accent: '#4338CA', ink: '#16152B', muted: '#68668A', tint: '#EEEDF8', rule: '#D6D4EC', paper: '#FBFBFE', chrome: 'none' },
  forest: { accent: '#1F6B4A', ink: '#18221D', muted: '#5F6C65', tint: '#ECF3EE', rule: '#D3DFD7', paper: '#FBFCFA', chrome: 'none' },
  navy: { accent: '#1B3A63', ink: '#14202E', muted: '#5B6675', tint: '#E9EEF5', rule: '#D0D8E3', paper: '#FBFCFD', chrome: 'none' },
  clay: { accent: '#B4472B', ink: '#2A211D', muted: '#7A6A62', tint: '#F8EDE7', rule: '#E8D8CE', paper: '#FEFBF8', chrome: 'none' },
  slate: { accent: '#2B2F36', ink: '#1B1D21', muted: '#6A6F78', tint: '#EFF0F2', rule: '#D8DBE0', paper: '#FCFCFD', chrome: 'none' },
  plum: { accent: '#7A1F3D', ink: '#261A20', muted: '#7A6670', tint: '#F7ECEF', rule: '#E8D4DA', paper: '#FDFAFB', chrome: 'none' },
  teal: { accent: '#0F6E73', ink: '#102226', muted: '#56696C', tint: '#E6F2F2', rule: '#CBDFE0', paper: '#FAFDFD', chrome: 'none' },
};
const TOKENS = ['accent', 'ink', 'muted', 'tint', 'rule', 'paper', 'chrome'];
const LABELS = { ar: ['صفحة', 'من'], he: ['עמוד', 'מתוך'], fa: ['صفحه', 'از'], ur: ['صفحہ', 'از'], en: ['Page', 'of'] };
const SIZES = { A4: [210, 297], Letter: [215.9, 279.4] };
const WEIGHTS = { Regular: 400, Medium: 500, Bold: 700 };
const MM = 96 / 25.4;

/** '61 days' between two dates written like '15 Oct 2026', 'October 15, 2026' or '2026-10-15'; '' if unparseable. */
function days(a, b) {
  const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
  const one = (s) => {
    s = String(s).trim().toLowerCase().replace(/,/g, '');
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2}) ([a-z]+) (\d{4})$/);
    const [day, mon, year] = m ? [m[1], m[2], m[3]] : (m = s.match(/^([a-z]+) (\d{1,2}) (\d{4})$/)) ? [m[2], m[1], m[3]] : [];
    const mo = MONTHS.indexOf((mon || '').slice(0, 3));
    return mo >= 0 ? Date.UTC(+year, mo, +day) : NaN;
  };
  const x = one(a), y = one(b);
  return Number.isNaN(x) || Number.isNaN(y) ? '' : `${Math.round(Math.abs(y - x) / 864e5)} days`;
}
const cssStr = (s) => '"' + String(s).replace(/["\\]/g, '\\$&').replace(/\n/g, ' ') + '"';

function faces(family) {
  const dir = path.join(FONTS, family);
  if (!fs.existsSync(dir)) return '';
  return Object.entries(WEIGHTS).map(([style, w]) => {
    const f = path.join(dir, `${family}-${style}.ttf`);
    return fs.existsSync(f) ? `@font-face{font-family:${cssStr(family)};font-weight:${w};src:url(${cssStr(pathToFileURL(f).href)})}` : '';
  }).join('');
}
const stack = (f) => (fs.existsSync(path.join(FONTS, f)) ? cssStr(f) + ',' : f + ',') + 'sans-serif';

class Doc {
  /** new Doc({lang, theme | accent (+ ink muted tint rule paper chrome), font, head, size:'A4', title, footer, header, numbers, css}) */
  constructor(o = {}) {
    const lang = o.lang || 'en';
    this.o = { size: 'A4', title: 'Document', footer: '', header: '', margin: 20, digits: '', numbers: false, css: '', ...o, lang };
    this.rtl = o.dir ? o.dir === 'rtl' : RTL.includes(lang);
    this.font = o.font || (this.rtl && lang !== 'he' ? 'IBMPlexSansArabic' : 'Rubik');
    this.head = o.head || (!this.rtl ? (fs.existsSync(path.join(FONTS, DISPLAY)) ? DISPLAY : this.font) : lang === 'he' ? 'Rubik' : 'Cairo');
    if (!o.theme && !o.accent) throw new Error(`choose the colours for this document: theme (${Object.keys(THEMES).join(' ')}) or your own accent, optionally with ink muted tint rule paper`);
    const base = typeof o.theme === 'object' ? o.theme : o.theme ? THEMES[o.theme] : {};
    if (!base) throw new Error('unknown theme ' + o.theme + ': ' + Object.keys(THEMES).join(' ') + ', or pass your own accent');
    this.t = { ...NEUTRAL, ...base };
    for (const k of TOKENS) if (o[k]) this.t[k] = o[k];
    if (!SIZES[this.o.size]) throw new Error('size must be A4 or Letter');
  }

  // ---- layout primitives (there is no ready-made cover, masthead, figure row or card grid: compose them)
  /** Text in any voice. size: 'display' | 'xl' | 'l' | 'm' | 's' | 'xs' or points; font: 'head' | 'body'; color: 'ink' | 'muted' | 'accent' | 'paper' | any CSS colour;
   *  weight; caps (small uppercase, Latin only); tag ('div', 'h1', 'p', 'span'…); style (extra CSS). */
  text(html, { size = 'm', font = 'body', color = 'ink', weight, caps = false, tag = 'div', style = '' } = {}) {
    const em = { display: 3.6, xl: 2.4, l: 1.6, m: 1, s: 0.85, xs: 0.72 };
    const big = typeof size === 'number' ? size >= 20 : (em[size] || 1) >= 1.6;
    const fsz = typeof size === 'number' ? `${size}pt` : `${em[size] || 1}em`;
    const c = ['ink', 'muted', 'accent', 'paper', 'tint', 'rule'].includes(color) ? `var(--${color})` : color;
    const w = weight || (font === 'head' ? 'var(--hw)' : 400);
    const cp = caps && !this.rtl ? 'text-transform:uppercase;letter-spacing:.1em;' : '';
    return `<${tag} class="tx" style="font-size:${fsz};font-family:var(--${font === 'head' ? 'hf' : 'bf'});color:${c};font-weight:${w};line-height:${big ? (this.rtl ? 1.35 : 1.08) : 'inherit'};${cp}${style}">${html}</${tag}>`;
  }
  /** Columns: widths as relative numbers ([2, 1]) or a count (3); cells are HTML strings. gap in mm; align 'start' | 'center' | 'end' | 'stretch'. Mirrors in right-to-left. */
  grid(widths, cells, { gap = 6, align = 'start', style = '' } = {}) {
    const w = Array.isArray(widths) ? widths : Array(widths).fill(1);
    return `<div class="gr" style="grid-template-columns:${w.map((x) => `minmax(0,${x}fr)`).join(' ')};gap:${gap}mm;align-items:${align};${style}">${cells.map((c) => `<div>${c}</div>`).join('')}</div>`;
  }
  /** A region: fill 'none' | 'tint' | 'accent' | 'ink' | any CSS colour; pad in mm; edge 'none' | 'top' | 'start' | 'bottom' | 'all' (a line in edgeColor); radius in mm; minHeight in mm. */
  box(html, { fill = 'none', pad = 5, edge = 'none', edgeColor = 'accent', weight = 1.5, radius = 0, minHeight = 0, style = '' } = {}) {
    const v = (x) => (['ink', 'muted', 'accent', 'paper', 'tint', 'rule'].includes(x) ? `var(--${x})` : x);
    const bg = fill === 'none' ? 'transparent' : v(fill), fg = fill === 'accent' || fill === 'ink' ? 'color:var(--paper);' : '';
    const ln = `${weight}px solid ${v(edgeColor)}`;
    const ed = edge === 'all' ? `border:${ln};` : edge === 'top' ? `border-top:${ln};` : edge === 'bottom' ? `border-bottom:${ln};` : edge === 'start' ? `border-inline-start:${ln};` : '';
    return `<div class="bx" style="background:${bg};${fg}padding:${pad}mm;${ed}border-radius:${radius}mm;${minHeight ? `min-height:${minHeight}mm;` : ''}${style}">${html}</div>`;
  }
  /** A line: color, weight in px, width ('100%' or mm), space above and below in mm. */
  rule({ color = 'rule', weight = 1, width = '100%', space = 4 } = {}) {
    const c = ['ink', 'muted', 'accent', 'rule'].includes(color) ? `var(--${color})` : color;
    return `<div style="height:0;border-top:${weight}px solid ${c};width:${typeof width === 'number' ? width + 'mm' : width};margin:${space}mm 0"></div>`;
  }
  h1(t) { return `<h2 class="h1">${t}</h2>`; }
  h2(t) { return `<h3 class="h2">${t}</h3>`; }
  p(t) { return `<p>${t}</p>`; }
  small(t) { return `<p class="small">${t}</p>`; }
  bullets(items) { return `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`; }
  /** Latin phrase, number range or code inside Arabic text: keeps its own left-to-right order. */
  ltr(t) { return `<bdi dir="ltr">${t}</bdi>`; }
  gap(n = 10) { return `<div style="height:calc(${n}px*var(--s))"></div>`; }
  page() { return PAGE; }
  keep(...x) { return `<div class="keep">${x.join('')}</div>`; }
  /** Your own HTML and CSS (an extra block, a custom layout); pair it with the `css` option. Returned unchanged. */
  raw(html) { return html; }

  /** Inline line icon in the accent colour: a name from skills/icons/icons.json; an unknown name throws and lists the choices. Use it where it names the thing next to it (a date, a person, a place), never as ornament. */
  icon(name) { return iconSvg(name); }

  // ---- data blocks
  /** Icon row for a count out of a total ("8 of 12 confirmed"): pictogram(icon, on, total, caption). The first `on` icons take the accent. */
  pictogram(icon, on, total, caption) {
    const one = iconSvg(icon, 'pic');
    return `<figure class="picto"><div class="pr">${Array.from({ length: total }, (_, i) => `<span${i < on ? ' class="on"' : ''}>${one}</span>`).join('')}</div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
  }
  /** Progress rings for shares and completion: rings([[value, max, label, shownText?]]). The arc runs the reading way round (counter-clockwise in right-to-left documents). */
  rings(items) {
    return `<div class="rings" style="--n:${items.length}">${items.map(([v, m, label, shown]) => {
      const pct = Math.max(0, Math.min(100, (v / m) * 100));
      return `<figure class="ring"><div class="rg"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="rt" cx="18" cy="18" r="15.915"/><circle class="rv" cx="18" cy="18" r="15.915" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}"/></svg><b>${shown ?? Math.round(pct) + '%'}</b></div><figcaption>${label}</figcaption></figure>`;
    }).join('')}</div>`;
  }
  /** Proportional segmented bar with a legend: [[label, number, shownText?]]. */
  bar(items) {
    return `<div class="bar"><div class="seg">${items.map(([, v], i) => `<i style="flex:${v};--k:${i}"></i>`).join('')}</div><div class="leg">${items.map(([l, v, shown], i) => `<span><i style="--k:${i}"></i>${l} <b>${shown ?? v}</b></span>`).join('')}</div></div>`;
  }
  /** One-series chart in plain HTML and CSS (selectable text, shipped fonts, mirrors by itself in right-to-left documents):
   *  chart([[label, value, shownText?]], { type: 'columns' | 'bars', title, caption, height (mm, columns), highlight: 'last' | 'max' | 'all' | index }).
   *  Order follows reading order: in Arabic the first item sits at the right. Values start at zero. */
  chart(items, { type = 'columns', title, caption, height = 52, highlight } = {}) {
    const max = Math.max(...items.map(([, v]) => v), 0) || 1;
    const hi = highlight ?? (type === 'bars' ? 'max' : 'last');
    const on = (v, i) => hi === 'all' || (hi === 'last' && i === items.length - 1) || (hi === 'max' && v === max) || hi === i;
    const head = title ? `<h3 class="h2">${title}</h3>` : '';
    const foot = caption ? `<figcaption>${caption}</figcaption>` : '';
    if (type === 'bars') {
      const rows = items.map(([l, v, shown], i) => `<span class="cl">${l}</span><div class="ct"><div class="cf${on(v, i) ? ' on' : ''}" style="width:${Math.max(v / max * 100, 1.5).toFixed(1)}%"></div></div><b>${shown ?? v}</b>`).join('');
      return `<figure class="chart hbars">${head}<div class="cg">${rows}</div>${foot}</figure>`;
    }
    const cols = items.map(([, v, shown], i) => `<div class="cc"><b>${shown ?? v}</b><div class="cf${on(v, i) ? ' on' : ''}" style="--v:${(v / max).toFixed(3)}"></div></div>`).join('');
    const axis = items.map(([l]) => `<span>${l}</span>`).join('');
    return `<figure class="chart vcols">${head}<div class="plot" style="height:${height}mm">${cols}</div><div class="axis">${axis}</div>${foot}</figure>`;
  }
  /** 3 to 5 points. Exactly two points draw a span bar labelled with the interval (computed from the dates, or span: '8 weeks'). */
  timeline(items, { span } = {}) {
    const auto = items.length === 2 && !span ? days(items[0][0], items[1][0]) : '';
    const label = items.length === 2 ? span || (auto && this.rtl ? this.ltr(auto) : auto) : ''; // the computed label is English: keep its order inside right-to-left text
    return `<div class="tl" style="--n:${items.length}">${items.map(([d, l], i) => `<div><b>${d}</b><i>${i === 0 && label ? `<u>${label}</u>` : ''}</i><span>${l}</span></div>`).join('')}</div>`;
  }
  /** rows[0] is the header; widths relative; align string of s (start) | e (end, numbers) | c per column; total: last row is a total. */
  table(rows, { widths, align, total = false, zebra = false } = {}) {
    const n = rows[0].length, w = widths || Array(n).fill(1), sum = w.reduce((a, b) => a + b, 0);
    const al = (align || 's'.repeat(n)).split('').map((c) => ({ l: 'start', s: 'start', r: 'end', e: 'end', c: 'center' }[c] || 'start'));
    const cell = (tag, r) => r.map((c, i) => `<${tag} style="text-align:${al[i]}">${c}</${tag}>`).join('');
    const body = rows.slice(1).map((r, i) => `<tr${total && i === rows.length - 2 ? ' class="total"' : ''}>${cell('td', r)}</tr>`).join('');
    return `<table class="${zebra ? 'zebra' : ''}"><colgroup>${w.map((x) => `<col style="width:${(100 * x / sum).toFixed(2)}%">`).join('')}</colgroup><thead><tr>${cell('th', rows[0])}</tr></thead><tbody>${body}</tbody></table>`;
  }

  // ---- page chrome: margin boxes (text stays real and selectable, Chromium draws 'N of M')
  _pageCss(mt, mb, W, H) {
    const { t, o } = this, st = this.rtl ? 'right' : 'left', en = this.rtl ? 'left' : 'right';
    const [lp, lo] = LABELS[o.lang] || LABELS.en;
    const fmt = o.digits ? `, ${o.digits}` : '';
    const box = {};
    const add = (name, css) => { box[name] = (box[name] || 'content:"";') + css; };
    const g = (pos, size) => `background:linear-gradient(${t.accent},${t.accent}) ${pos}/${size} no-repeat;`;
    if (t.chrome === 'band') for (const b of ['top-left-corner', 'top-left', 'top-center', 'top-right', 'top-right-corner']) add(b, g('0 0', '100% 4.5mm'));
    if (t.chrome === 'side') for (const b of [`${st}-top`, `${st}-middle`, `${st}-bottom`, `top-${st}-corner`, `bottom-${st}-corner`]) add(b, g(`${st === 'right' ? '100%' : '0'} 0`, '4.5mm 100%'));
    if (t.chrome === 'rule') add(`top-${st}`, g(`${st} calc(100% - 7mm)`, '12mm 1.2mm'));
    if (o.header) add(`top-${en}`, `content:${cssStr(o.header)};text-align:${en};vertical-align:bottom;padding-bottom:5mm;`);
    for (const b of ['left', 'center', 'right']) add(`bottom-${b}`, `border-top:.5pt solid ${t.rule};vertical-align:top;padding-top:3.5mm;`);
    add(`bottom-${st}`, `content:${cssStr(o.footer || o.title)};text-align:${st};`);
    add(`bottom-${en}`, `content:${cssStr(lp + ' ')} counter(page${fmt}) ${cssStr(' ' + lo + ' ')} counter(pages${fmt});text-align:${en};`);
    const common = `font-family:${stack(this.font)};font-size:8.5pt;color:${t.muted};direction:${this.rtl ? 'rtl' : 'ltr'};`;
    const ml = Object.entries(box).map(([k, v]) => `@${k}{${common}${v}}`).join('');
    return `@page{size:${W}mm ${H}mm;margin:${mt}mm ${o.margin}mm ${mb}mm;background:${t.paper};${ml}}`;
  }

  _css(W, H, mt, mb) {
    const { t, o } = this, ar = this.rtl;
    const hf = stack(this.head), bf = stack(this.font);
    const hw = this.head === DISPLAY ? 400 : 700, serif = this.head === DISPLAY;
    const dig = o.digits || 'decimal-leading-zero';
    const track = ar ? '' : 'letter-spacing:.12em;text-transform:uppercase;';
    const sh = 'color-mix(in srgb,var(--accent) calc(100% - var(--k)*22%),var(--paper))';
    return `${faces(this.font)}${this.head !== this.font ? faces(this.head) : ''}
${this._pageCss(mt, mb, W, H)}
:root{--ink:${t.ink};--muted:${t.muted};--accent:${t.accent};--tint:${t.tint};--rule:${t.rule};--paper:${t.paper};--hf:${hf};--bf:${bf};--hw:${hw}}
.gr{display:grid;margin-bottom:calc(1.1em*var(--s));break-inside:avoid}.gr>div>:last-child,.bx>:last-child{margin-bottom:0}
.bx{margin-bottom:calc(1.1em*var(--s));break-inside:avoid}.gr .bx{margin-bottom:0}
.tx{margin:0 0 .35em}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{width:${W - 2 * o.margin}mm;font-family:${bf};color:var(--ink);-webkit-print-color-adjust:exact;counter-reset:sec}
.pg{--s:1;--f:calc(1 + .12*(var(--s) - 1));font-size:calc(${ar ? 10.5 : 10}pt*var(--f));line-height:${ar ? 1.85 : 1.6};display:flow-root;break-after:page;position:relative}
.pg:last-child{break-after:auto}
.pg>:first-child{margin-top:0}
p{margin:0 0 calc(.75em*var(--s));orphans:2;widows:2}
.h1{font-family:${hf};font-weight:${hw};font-size:${serif ? 2.1 : 1.6}em;line-height:1.2;color:var(--ink);margin:calc(1.7em*var(--s)) 0 calc(.6em*var(--s));break-after:avoid}
${o.numbers ? `.h1::before{counter-increment:sec;content:counter(sec,${dig});display:block;font-family:${bf};font-size:.4em;font-weight:700;color:var(--accent);margin-bottom:.7em;${ar ? '' : 'letter-spacing:.14em;'}}` : ''}
.h2{font-weight:700;font-size:1.05em;line-height:1.5;color:var(--ink);margin:0 0 .3em;break-after:avoid}
.small{font-size:.85em;color:var(--muted)}
b,strong{font-weight:700}i,em{font-style:normal;color:var(--accent);font-weight:500}
ul{margin:0 0 calc(.75em*var(--s));padding-inline-start:1.4em}li{margin-bottom:calc(.35em*var(--s))}li::marker{color:var(--accent)}
.keep,.tl,.bar,.chart{break-inside:avoid;margin-bottom:calc(1.1em*var(--s))}
.bar .seg{display:flex;gap:3px;height:.95em}.bar .seg i{border-radius:1em;background:${sh}}
.bar .leg{display:flex;flex-wrap:wrap;gap:.4em 1.5em;margin-top:.8em;font-size:.88em;color:var(--muted)}
.bar .leg i{display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-inline-end:.45em;background:${sh}}.bar .leg b{color:var(--ink)}
.ic{width:1.15em;height:1.15em;vertical-align:-.2em;color:var(--accent);flex:none}.ic.flip{${ar ? 'transform:scaleX(-1)' : ''}}
.picto,.rings{margin:0 0 calc(1.1em*var(--s));break-inside:avoid}
.picto .pr{display:flex;flex-wrap:wrap;gap:.35em .5em}.picto .pic{display:block;width:2.1em;height:2.1em;color:color-mix(in srgb,var(--muted) 38%,var(--paper))}.picto span.on .pic{color:var(--accent)}
.picto figcaption{color:var(--muted);font-size:.88em;margin-top:.7em}
.rings{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:1.4em}
.ring{margin:0;text-align:center}.ring .rg{position:relative;width:27mm;height:27mm;margin:0 auto}
.ring svg{width:100%;height:100%;transform:${ar ? 'scaleX(-1) ' : ''}rotate(-90deg);fill:none;stroke-width:3.2}
.ring .rt{stroke:var(--tint)}.ring .rv{stroke:var(--accent);stroke-linecap:round}
.ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:${hf};font-weight:${hw};font-size:1.45em}
.ring figcaption{color:var(--muted);font-size:.88em;margin-top:.6em}
.chart{margin:0 0 calc(1.1em*var(--s));break-inside:avoid}
.chart figcaption{color:var(--muted);font-size:.85em;margin-top:.7em}
.chart .cf{border-radius:.35em;background:color-mix(in srgb,var(--accent) 28%,var(--paper))}.chart .cf.on{background:var(--accent)}
.chart b{font-weight:700;font-size:.95em;white-space:nowrap}
.vcols .plot,.vcols .axis{display:flex;gap:1.4em;padding-inline:.8em}
.vcols .plot{align-items:stretch;padding-top:1.9em;border-bottom:1px solid var(--ink)}
.vcols .cc{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.vcols .cc b{margin-bottom:.4em}.vcols .cf{width:100%;max-width:30mm;height:calc(var(--v)*(100% - 1.9em));min-height:2px;border-radius:.35em .35em 0 0}
.vcols .axis{margin-top:.6em;color:var(--muted);font-size:.88em}.vcols .axis span{flex:1;min-width:0;text-align:center}
.hbars .cg{display:grid;grid-template-columns:max-content minmax(0,1fr) max-content;gap:.75em 1em;align-items:center}
.hbars .cl{color:var(--muted);font-size:.92em}.hbars .ct{height:1.05em;background:var(--tint);border-radius:1em;overflow:hidden}.hbars .cf{height:100%;border-radius:1em}
.tl{display:grid;grid-template-columns:repeat(var(--n),1fr);grid-template-rows:auto auto auto;text-align:center}
.tl>div{display:grid;grid-row:span 3;grid-template-rows:subgrid}
.tl b{display:block}.tl span{display:block;color:var(--muted);font-size:.9em;padding:0 .4em;line-height:1.7}
.tl i{display:block;position:relative;height:1.1em;margin:.2em 0}
.tl i::before{content:"";position:absolute;top:50%;inset-inline:0;height:1.5px;margin-top:-.75px;background:var(--accent)}
.tl>div:first-child i::before{inset-inline-start:50%}.tl>div:last-child i::before{inset-inline-end:50%}
.tl u{position:absolute;top:50%;inset-inline-end:0;transform:translate(${ar ? '-' : ''}50%,-50%);text-decoration:none;white-space:nowrap;font-size:.85em;font-weight:700;line-height:1.5;color:var(--accent);background:var(--paper);border:1px solid var(--accent);border-radius:1em;padding:0 .8em;z-index:1}
.tl i::after{content:"";position:absolute;top:0;left:50%;width:1.1em;height:1.1em;margin-left:-.55em;border-radius:50%;background:var(--accent);box-shadow:inset 0 0 0 .3em var(--paper),0 0 0 1px var(--accent)}
table{width:100%;border-collapse:collapse;margin-bottom:calc(1.1em*var(--s));table-layout:fixed}
thead{display:table-header-group}tr{break-inside:avoid}
th,td{padding:calc(.55em*var(--s)) .75em;vertical-align:middle;overflow-wrap:anywhere}
td{border-bottom:.5pt solid var(--rule)}td:first-child{font-weight:500}
th{font-weight:700;font-size:.76em;${track}color:var(--muted);border-bottom:1px solid var(--ink)}
.total td{font-weight:700;border-top:1px solid var(--ink);border-bottom:0}
.zebra tbody tr:nth-child(even){background:var(--tint)}
${o.css}`;
  }

  /** build(file, body, {pages}): body is a string or array of helper outputs, k.page() between pages.
   *  Each page-chunk gets spacing and size tuned toward its pages (a short page may stay short); prints pages and fill. */
  async build(file, body, { pages } = {}) {
    const { chromium } = require('playwright');
    const o = this.o, [W, H] = SIZES[o.size], mt = 24, mb = 24;
    const html = Array.isArray(body) ? body.join('\n') : String(body);
    const secs = html.split(PAGE).map((s) => s.trim()).filter(Boolean);
    const doc = `<!doctype html><html lang="${o.lang}" dir="${this.rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${o.title}</title><style>${this._css(W, H, mt, mb)}</style></head><body>${secs.map((s) => `<section class="pg">${s}</section>`).join('')}</body></html>`;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfhtml-'));
    const src = path.join(tmp, 'doc.html');
    fs.writeFileSync(src, doc);
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
    try {
      const page = await browser.newPage({ viewport: { width: Math.round((W - 2 * o.margin) * MM), height: 1400 } });
      await page.emulateMedia({ media: 'print' });
      await page.goto(pathToFileURL(src).href);
      await page.evaluate(() => document.fonts.ready);
      const avail = (H - mt - mb) * MM;
      let info, count, slack = 0.93;
      for (let i = 0; i < 4; i++) {
        info = await page.evaluate(fit, { avail, slack, pin: pages || 0 });
        await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
        count = (fs.readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
        if (count <= info.reduce((a, s) => a + s.n, 0)) break;
        slack -= 0.04;
      }
      const fill = info.map((s) => s.fill);
      console.log('built', file, JSON.stringify({ pages: count, fill, scale: info.map((s) => s.s) }));
      const want = info.reduce((a, s) => a + s.n, 0);
      if (count > want) console.log(`WARN built ${count} pages for ${want} planned: a page-chunk overflows even at the smallest size; shorten it or move content across a d.page()`);
      fill.forEach((f, i) => { if (f < 0.6 && (i < fill.length - 1 || fill.length === 1 || pages)) console.log(`WARN page-chunk ${i + 1} is only ${Math.round(f * 100)}% full: fine if it is short on purpose; otherwise add real content, never padding`); });
      return { pages: count, fill };
    } finally {
      await browser.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// runs in the page: choose --s per section (n = pages it needs at s = 1); modest stretch only, whitespace is fine
function fit({ avail, slack, pin }) {
  const secs = [...document.querySelectorAll('.pg')];
  return secs.map((el) => {
    const h = (s) => { el.style.setProperty('--s', s); return el.getBoundingClientRect().height; };
    const n = pin && secs.length === 1 ? pin : Math.max(1, Math.ceil(h(1) / avail - 0.02));
    const cap = n * avail * (n > 1 ? slack - 0.02 : slack);
    let lo = 0.75, hi = 1.2;
    if (h(lo) > cap) hi = lo;
    else for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; if (h(m) <= cap) lo = m; else hi = m; }
    return { n, s: +lo.toFixed(2), fill: +(h(lo) / (n * avail)).toFixed(2) };
  });
}

module.exports = { Doc, THEMES };
