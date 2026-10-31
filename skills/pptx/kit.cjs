// Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
// SPDX-License-Identifier: LicenseRef-Proprietary
'use strict';
// PptxGenJS 4.0.1 kit: theme tokens, deck factory, layout primitives. 13.333 x 7.5 in, all units inches.
// Write coordinates for left-to-right; with rtl:true the kit mirrors x, alignment, tables, charts and slide number.
const PptxGenJS = require('pptxgenjs');

const W = 13.333, H = 7.5, M = 0.7;

// ink/muted/accent* on bg must keep contrast. `deep` = background of dark slides. dark:true = palette is itself dark.
const PALETTES = {
  coral:    { bg: 'FBF7F2', surface: 'F3EBE2', ink: '2B2522', muted: '6E645D', accent: 'E0664F', accentText: 'C4452F', accent2: '2F6F62', rule: 'D9CFC4', deep: '2B2522' },
  forest:   { bg: 'F4F1E8', surface: 'E3E8DA', ink: '17301F', muted: '55645A', accent: '1F6B45', accent2: 'C8A24A', rule: 'CBD2C0', deep: '12281A', accentDk: '8FD0A5' },
  ocean:    { bg: 'F5F9FC', surface: 'E1ECF5', ink: '0B2540', muted: '4F657B', accent: '0B6BCB', accent2: 'F2994A', rule: 'C9D8E6', deep: '0B2540', accentDk: '6CB4F5' },
  plum:     { bg: 'FAF7FB', surface: 'EFE7F3', ink: '2A1736', muted: '6B5A76', accent: '7B3FA0', accent2: 'E8A33D', rule: 'DCD0E3', deep: '2A1736', accentDk: 'D2A8EA' },
  ink:      { bg: 'FFFFFF', surface: 'F1F1EE', ink: '111111', muted: '5C5C5C', accent: 'FF4B1F', accentText: 'D13A12', accent2: '111111', rule: 'D8D8D4', deep: '111111' },
  dune:     { bg: 'F7F1E5', surface: 'EBDFC6', ink: '3A2A12', muted: '6F5E43', accent: '0F6B5C', accent2: 'B8862B', rule: 'D8CBAE', deep: '1F2B2A', accentDk: '6FD0BC' },
  midnight: { bg: '0E1726', surface: '16233A', ink: 'EEF2F8', muted: '9AA8BD', accent: '38BDF8', accent2: 'F5B83D', rule: '26364F', deep: '0E1726', dark: true },
  graphite: { bg: '1A1A1E', surface: '26262C', ink: 'F2F2EE', muted: 'A3A3A8', accent: 'C6F04A', accent2: 'FF7A59', rule: '36363D', deep: '1A1A1E', dark: true },
};

// Only fonts PowerPoint has everywhere and LibreOffice renders faithfully (Arial/Times/Courier map to metric-equal Liberation fonts).
const FONTS = {
  editorial: { head: 'Times New Roman', body: 'Arial', mono: 'Arial', stat: 'Times New Roman', headBold: false },
  grotesk:   { head: 'Arial', body: 'Arial', mono: 'Arial', stat: 'Arial', headBold: true },
  condensed: { head: 'Arial Narrow', body: 'Arial', mono: 'Arial', stat: 'Arial Narrow', headBold: true },
  technical: { head: 'Arial', body: 'Arial', mono: 'Courier New', stat: 'Courier New', headBold: true },
  arabic:    { head: 'Noto Naskh Arabic', body: 'Noto Sans Arabic', mono: 'Noto Sans Arabic', stat: 'Noto Naskh Arabic', headBold: true },
};

const S = { kicker: 12, title: 32, h2: 22, body: 16, small: 12, stat: 60 };

const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const lum = (h) => { const [r, g, b] = hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const readable = (bg, light, dark) => (contrast(bg, light) >= contrast(bg, dark) ? light : dark);

// ---- stylesheet (shared concept in artifact-taste/SKILL.md, "Styling"): CSS as an object, compiled to PptxGenJS options.
const SAFE = ['Arial', 'Arial Narrow', 'Times New Roman', 'Courier New', 'Noto Naskh Arabic', 'Noto Sans Arabic'];
const GENERIC = { serif: 'Times New Roman', 'sans-serif': 'Arial', monospace: 'Courier New' };
const ELEMENTS = ['body', 'th', 'td', 'chart'];
const PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'verticalAlign',
  'background', 'padding', 'border', 'borderTop', 'borderBottom', 'borderInlineStart', 'borderInlineEnd', 'borderRadius', 'opacity', 'composes', 'pptx'];
const NOT_HERE = { display: 'lay boxes out with d.split, d.grid and d.stack', gridTemplateColumns: 'use d.grid(box, [2, 1])', flex: 'use d.split or d.stack', gap: 'pass gap to d.grid, d.split or d.stack',
  margin: 'place the box with d.split or d.grid', width: 'boxes come from d.page, d.split and d.grid', height: 'boxes come from d.page, d.split and d.grid', boxShadow: 'PowerPoint shapes here have no shadow option; use a darker border', backgroundImage: 'place an image with s.addImage' };
const lev = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
/** a length in points: 12 | '12pt' | '4mm' | '0.2in' | '16px' | '1.5em' (em needs the font size) */
const pt = (v, em = 16) => { if (typeof v === 'number') return v; const m = String(v).trim().match(/^(-?[\d.]+)\s*(pt|mm|in|px|em|rem)?$/); if (!m) throw new Error(`style: not a length: ${v}`); const n = +m[1]; return { pt: n, mm: n * 72 / 25.4, in: n * 72, px: n * 0.75, em: n * em, rem: n * em }[m[2] || 'pt']; };

function deck(o = {}) {
  const rtl = !!o.rtl, style = o.style || {};
  const sv = (k) => (style[`--${k}`] ? String(style[`--${k}`]).replace('#', '').toUpperCase() : undefined);
  /** a length that may be a variable: '--radius' set in style, used as var(--radius) or radius */
  const len = (v, em) => {
    for (let i = 0; i < 4 && typeof v === 'string'; i++) {
      const m = v.trim().match(/^var\(--([\w-]+)\)$/), k = m ? m[1] : v.trim();
      if (style[`--${k}`] === undefined) break;
      v = style[`--${k}`];
    }
    return pt(v, em);
  };
  if (!o.palette && !style['--accent']) throw new Error(`choose the colours for this deck: style {'--accent': '#…', '--ink', '--bg', …}, or palette (${Object.keys(PALETTES).join(' ')})`);
  const P0 = typeof o.palette === 'object' ? { ...PALETTES.coral, ...o.palette } : o.palette ? PALETTES[o.palette] : { bg: 'FFFFFF', surface: 'F1F1EE', ink: '1C1C1E', muted: '6B6B70', accent: sv('accent'), accent2: '6B6B70', rule: 'DCDCD8', deep: '1C1C1E' };
  if (!P0) throw new Error(`unknown palette ${o.palette}: ${Object.keys(PALETTES).join(' ')}, or set --accent in style`);
  const P = { ...P0 };
  for (const k of ['bg', 'surface', 'ink', 'muted', 'accent', 'accent2', 'rule', 'deep', 'accentDk']) if (sv(k)) P[k] = sv(k);
  if (sv('accent') && !sv('accentText')) delete P.accentText;
  if (sv('accent') && !sv('accentDk')) delete P.accentDk;
  // rtl: Noto Arabic faces; only a fonts object {head, body, ...} overrides them (a preset name is ignored)
  const fo = typeof o.fonts === 'object' ? o.fonts : null;
  const F = rtl ? { ...FONTS.arabic, ...fo } : { ...FONTS.editorial, ...(fo || FONTS[o.fonts || 'editorial']) };
  const classes = {}, elements = {}, warned = new Set();
  const warn = (m) => { if (!warned.has(m)) { warned.add(m); console.log('WARN ' + m); } };
  for (const [k, v] of Object.entries(style)) {
    if (k.startsWith('--')) continue;
    if (k.startsWith('.')) classes[k.slice(1)] = v;
    else if (ELEMENTS.includes(k)) elements[k] = v;
    else throw new Error(`style: "${k}" is not a variable (--name), a class (.name) or an element (${ELEMENTS.join(' ')})`);
  }
  const check = (props) => Object.keys(props).forEach((k) => {
    if (PROPS.includes(k)) return;
    if (NOT_HERE[k]) throw new Error(`style: ${k} is CSS but not something a slide text box can do: ${NOT_HERE[k]}`);
    throw new Error(`style: unknown property ${k} (did you mean ${PROPS.map((p) => [p, lev(k, p)]).sort((a, b) => a[1] - b[1])[0][0]}?); supported: ${PROPS.join(' ')}`);
  });
  Object.values(classes).concat(Object.values(elements)).forEach(check);
  /** merged props for a class list: body < classes (with composes) < inline */
  const resolve = (cls, inline = {}) => {
    const out = { ...(elements.body || {}) };
    const add = (n, seen) => {
      n = String(n).replace(/^\./, '');
      if (!classes[n]) throw new Error(`style: no class .${n}; defined: ${Object.keys(classes).map((x) => '.' + x).join(' ') || '(none)'}`);
      if (seen.has(n)) throw new Error(`style: class .${n} composes itself`);
      [].concat(classes[n].composes || []).forEach((c) => add(c, new Set([...seen, n])));
      Object.assign(out, classes[n]);
    };
    [].concat(cls || []).flatMap((c) => String(c).split(/\s+/)).filter(Boolean).forEach((c) => add(c, new Set()));
    check(inline);
    return { ...out, ...inline };
  };
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = o.title || 'Presentation';
  if (o.author) pptx.author = o.author;
  if (rtl) pptx.rtlMode = true;

  const mk = (c) => ({ ...c, onAccent: readable(c.accent, 'FFFFFF', c.deep) });
  const LIGHT = mk({ bg: P.bg, surface: P.surface, ink: P.ink, muted: P.muted, accent: P.accent, accentText: P.accentText || P.accent, accent2: P.accent2, rule: P.rule, deep: P.deep });
  // the accent on a dark slide: --accentDk, or the accent lightened until it reads on the deep colour
  let dk = P.accentDk || P.accent;
  if (!P.accentDk) for (let t = 0.1; t <= 1 && contrast(dk, P.deep) < 4.5; t += 0.1) dk = mix(P.accent, 'FFFFFF', t);
  const DARK = P.dark ? LIGHT : mk({ bg: P.deep, surface: mix(P.deep, P.bg, 0.09), ink: P.bg, muted: mix(P.deep, P.bg, 0.68), accent: dk, accentText: dk, accent2: P.accent2, rule: mix(P.deep, P.bg, 0.22), deep: P.deep });

  const X = (x, w) => (rtl ? W - x - w : x);
  const flip = (a) => (rtl ? { left: 'right', right: 'left' }[a] || a : a);

  // text size estimates: average glyph width in em, 1.2 line height
  const em = (bold) => (rtl ? 0.5 : bold ? 0.56 : 0.48);
  const lines = (str, size, w, bold) => String(str).split('\n').reduce((n, p) => n + Math.max(1, Math.ceil((p.length * size * em(bold)) / 72 / w)), 0);
  const th = (str, size, w, bold) => (lines(str, size, w, bold) * size * 1.2) / 72;
  // shrink font so a one-line string of n chars fits wIn inches
  const fit = (str, size, wIn) => Math.max(10, Math.min(size, Math.floor((wIn * 72) / (String(str).length * 0.58))));

  // ---- compile resolved CSS props to PptxGenJS text options (and the shape/lines a box draws)
  const colour = (s, v) => {
    if (v === undefined) return undefined;
    let x = String(v).trim();
    const m = x.match(/^var\(--([\w-]+)\)$/); if (m) x = m[1];
    if (s && s.c[x]) return s.c[x];   // theme names follow the slide, so var(--accent) and var(--ink) stay readable on dark slides; use #RRGGBB for a fixed colour
    if (style[`--${x}`] !== undefined) x = String(style[`--${x}`]);
    x = x.replace('#', '');
    if (/^[0-9a-f]{3}$/i.test(x)) x = x.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(x)) throw new Error(`style: colour ${v} must be #RRGGBB, a --variable or one of ${Object.keys(s ? s.c : LIGHT).join(' ')}`);
    return x.toUpperCase();
  };
  const face = (v) => {
    const list = (Array.isArray(v) ? v : String(v).split(',')).map((f) => String(f).trim().replace(/^["']|["']$/g, ''));
    if (rtl) return list.find((f) => /arabic/i.test(f) && SAFE.includes(f)) || F.body; // right-to-left text needs an Arabic face; Latin faces fall back to the Noto Arabic body
    const ok = list.map((f) => GENERIC[f] || f).find((f) => SAFE.includes(f) || Object.values(F).includes(f));
    if (!ok) throw new Error(`style: none of ${list.join(', ')} is a font every PowerPoint and LibreOffice has; end the list with one of ${SAFE.join(', ')} or serif / sans-serif / monospace`);
    return ok;
  };
  // border shorthand '2pt solid accent' | 'var(--line) ink': the first token that is a length is the width, the first other one the colour
  const isLen = (t) => { try { len(t); return true; } catch { return false; } };
  const stroke = (s, v) => { const m = String(v).trim().split(/\s+/).filter((t) => !/^(solid|dashed|dotted)$/.test(t)); const w = m.find(isLen); return { width: w ? len(w) : 1, color: colour(s, m.find((t) => t !== w) || 'rule') }; };
  const compile = (s, c) => {
    const size = c.fontSize !== undefined ? len(c.fontSize) : S.body, opt = {};
    if (c.fontSize !== undefined) opt.fontSize = size;
    if (size < 12) warn(`fontSize ${size}pt is below the 12pt reading floor for slides`);
    if (c.fontFamily) opt.fontFace = face(c.fontFamily);
    if (c.fontWeight !== undefined) opt.bold = c.fontWeight === 'bold' || +c.fontWeight >= 600;
    if (c.fontStyle) opt.italic = c.fontStyle === 'italic';
    if (c.color) opt.color = colour(s, c.color);
    if (c.lineHeight) opt.lineSpacingMultiple = +c.lineHeight;
    if (c.letterSpacing !== undefined) { if (rtl) warn('letterSpacing ignored in right-to-left text (it breaks letter joining)'); else opt.charSpacing = len(c.letterSpacing, size); }
    if (c.textAlign) opt.align = { start: flip('left'), end: flip('right'), left: 'left', right: 'right', center: 'center' }[c.textAlign];
    if (c.verticalAlign) opt.valign = c.verticalAlign === 'middle' ? 'middle' : c.verticalAlign;
    if (c.padding !== undefined) opt.margin = len(String(c.padding).split(/\s+/)[0], size);
    if (c.opacity !== undefined) opt.transparency = Math.round((1 - c.opacity) * 100);
    return { ...opt, ...(c.pptx || {}) };
  };
  const caseOf = (c, str) => (rtl || typeof str !== 'string' ? str : c.textTransform === 'uppercase' ? str.toUpperCase() : c.textTransform === 'lowercase' ? str.toLowerCase() : c.textTransform === 'capitalize' ? str.replace(/\b\w/g, (x) => x.toUpperCase()) : str);
  /** background, border, radius and per-side borders of a box; returns the inside box after padding */
  function paint(s, c, b) {
    const fill = c.background ? colour(s, c.background) : null, ln = c.border ? stroke(s, c.border) : null;
    if (fill || ln) {
      const r = c.borderRadius !== undefined ? len(c.borderRadius) / 72 : 0;
      s.addShape(r ? 'roundRect' : 'rect', { x: X(b.x, b.w), y: b.y, w: b.w, h: b.h, ...(r ? { rectRadius: r } : {}), fill: fill ? { color: fill } : { type: 'none' }, line: ln ? { color: ln.color, width: ln.width } : { type: 'none' } });
    }
    const side = (key, x, y, w, h) => { if (!c[key]) return; const l = stroke(s, c[key]); s.addShape('line', { x: X(x, w), y, w, h, line: { color: l.color, width: l.width } }); };
    side('borderTop', b.x, b.y, b.w, 0); side('borderBottom', b.x, b.y + b.h, b.w, 0);
    side('borderInlineStart', b.x, b.y, 0, b.h); side('borderInlineEnd', b.x + b.w, b.y, 0, b.h);
    const p = c.padding !== undefined ? String(c.padding).split(/\s+/).map((v) => len(v) / 72) : [0];
    const [t, r2 = t, bo = t, l = r2] = p;
    return { x: b.x + l, y: b.y + t, w: b.w - l - r2, h: b.h - t - bo };
  }
  const split4 = (a) => { const { x, y, w, h, ...rest } = a || {}; return [{ x, y, w, h }, rest]; };
  if (elements.body && elements.body.fontFamily) F.body = face(elements.body.fontFamily); // footer, timeline and table text follow the body font

  // ---- low level (all mirror-aware, colors default from the slide's theme s.c) ----
  /** styled text: d.text(s, str, cls, {x, y, w, h, ...inline CSS}). An object in the cls slot is the box plus inline CSS. */
  function stext(s, str, cls, at) {
    if (cls && typeof cls === 'object' && !Array.isArray(cls)) { at = cls; cls = ''; }
    const [b, { on, ...inline }] = split4(at);   // on: the colour under this text when a shape, not the slide, is its ground
    if ([b.x, b.y, b.w, b.h].some((v) => typeof v !== 'number')) throw new Error('text needs a box {x, y, w, h} in inches (from d.page, d.split, d.grid, d.stack)');
    const c = resolve(cls, inline);
    const inner = c.background || c.border || c.borderTop || c.borderBottom || c.borderInlineStart || c.borderInlineEnd ? paint(s, { ...c, padding: undefined }, b) : b;
    const { align, ...opt } = compile(s, c);
    const size = opt.fontSize || S.body, ground = c.background ? colour(s, c.background) : on ? colour(s, on) : s.c.bg, ink = opt.color || s.c.ink;
    if (size < 18 && contrast(ink, ground) < 4.5) warn(`text "${String(str).slice(0, 24)}" (${size}pt, #${ink} on #${ground}) has contrast ${contrast(ink, ground).toFixed(1)}:1, under 4.5:1 for small text`);
    raw(s, caseOf(c, str), { ...inner, ...opt, align: align ? (align === flip('left') ? 'start' : align === flip('right') ? 'end' : align) : 'start' });
  }
  /** a region from a class: background, border, borderRadius, per-side borders, padding. Returns the inside box for its content. */
  function box(s, cls, at) {
    if (cls && typeof cls === 'object' && !Array.isArray(cls)) { at = cls; cls = ''; }
    const [b, inline] = split4(at);
    return paint(s, resolve(cls, inline), b);
  }
  /** stack text items top to bottom inside a box: items [[str, cls, inline?], …]; heights come from each class's size. Returns the space left below. */
  function stack(s, b, items, gap = 0.15) {
    const g = typeof gap === 'number' ? gap : len(gap) / 72;
    let y = b.y;
    for (const [str, cls, inline = {}] of items) {
      const c = resolve(cls, inline), size = c.fontSize !== undefined ? len(c.fontSize) : S.body;
      const bold = c.fontWeight === 'bold' || +c.fontWeight >= 600, pad = c.padding !== undefined ? (2 * len(String(c.padding).split(/\s+/)[0], size)) / 72 : 0;
      const h = th(caseOf(c, str), size, b.w - pad, bold) * (c.lineHeight ? +c.lineHeight / 1.2 : 1) + pad + 0.04;
      stext(s, str, cls, { x: b.x, y, w: b.w, h, ...inline });
      y += h + g;
    }
    return { x: b.x, y, w: b.w, h: Math.max(0, b.y + b.h - y) };
  }
  function raw(s, str, a = {}) {
    const { x, y, w, h, font = 'body', align = 'start', ...r } = a;
    const al = align === 'start' ? flip('left') : align === 'end' ? flip('right') : align;
    if (rtl && typeof str === 'string') str = str.replace(/(\d)\s*°/g, '$1‏°'); // RLM: the degree sign stays on the far side of its number, as in Arabic typesetting
    s.addText(str, {
      fontFace: F[font], fontSize: S.body, color: s.c.ink, margin: 0, valign: 'top',
      ...(font === 'head' && F.headBold ? { bold: true } : {}),
      ...(rtl ? { rtlMode: true, lang: 'ar-SA' } : {}),
      ...r, x: X(x, w), y, w, h, align: al,
    });
  }
  function rect(s, a) {
    const { x, y, w, h, fill, line, shape = 'rect', alpha, lw = 1 } = a;
    s.addShape(shape, { x: X(x, w), y, w, h, fill: fill ? { color: fill, transparency: alpha || 0 } : { type: 'none' }, line: line ? { color: line, width: lw } : { type: 'none' } });
  }
  const rule = (s, x, y, w, color, pt = 0.75) => s.addShape('line', { x: X(x, w), y, w, h: 0, line: { color: color || s.c.rule, width: pt } });
  /** a line between two points at any angle, mirror-aware: d.line(s, {x1, y1, x2, y2, color, width, arrow, dash}). arrow: true at the end, 'both', 'start'. */
  function drawLine(s, a) {
    const { x1, y1, x2, y2, color, width = 1.5, arrow, dash } = a;
    for (const v of [x1, y1, x2, y2]) if (typeof v !== 'number') throw new Error('line needs {x1, y1, x2, y2} in inches');
    const ax = rtl ? W - x1 : x1, bx = rtl ? W - x2 : x2;
    s.addShape('line', { x: Math.min(ax, bx), y: Math.min(y1, y2), w: Math.abs(bx - ax), h: Math.abs(y2 - y1), ...(bx < ax ? { flipH: true } : {}), ...(y2 < y1 ? { flipV: true } : {}),
      line: { color: color ? colour(s, color) : s.c.ink, width, ...(dash ? { dashType: dash === true ? 'dash' : dash } : {}), ...(arrow === true || arrow === 'both' ? { endArrowType: 'triangle' } : {}), ...(arrow === 'start' || arrow === 'both' ? { beginArrowType: 'triangle' } : {}) } });
  }
  /** a circle by its centre and radius, mirror-aware: d.circle(s, {cx, cy, r, fill, line, lw, alpha}) */
  function circle(s, a) {
    const { cx, cy, r, fill, line, lw, alpha } = a;
    if ([cx, cy, r].some((v) => typeof v !== 'number')) throw new Error('circle needs {cx, cy, r} in inches');
    rect(s, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, shape: 'ellipse', fill: fill ? colour(s, fill) : undefined, line: line ? colour(s, line) : undefined, lw, alpha });
  }

  // ---- deck-level ----
  function slide(a = {}) {
    const s = pptx.addSlide();
    s.c = a.dark && !P.dark ? DARK : LIGHT;
    s.background = { color: a.bg || s.c.bg };
    const note = a.note !== undefined ? a.note : a.cover ? null : o.footer;
    if (note) { rule(s, M, 6.82, W - 2 * M, s.c.rule); raw(s, note, { x: M, y: 6.95, w: 9.5, h: 0.3, fontSize: 11, color: s.c.muted }); }
    if (a.num !== undefined ? a.num : !a.cover) s.slideNumber = { x: X(W - M - 1.2, 1.2), y: 6.95, w: 1.2, h: 0.3, fontFace: F.body, fontSize: 11, color: s.c.muted, align: flip('right'), margin: 0 };
    return s;
  }
  // one big number + label, filling its box; the value shrinks to stay on one line
  function stat(s, a) {
    // the value in `cls` (its fontSize is the most it may grow to), the label in `labelCls`
    const c = resolve(a.cls || []), vs = fit(a.value, c.fontSize !== undefined ? len(c.fontSize) : S.stat, a.w), vh = (vs * 1.15) / 72;
    stext(s, String(a.value), a.cls || [], { x: a.x, y: a.y, w: a.w, h: vh, fontSize: vs, verticalAlign: 'bottom' });
    stext(s, a.label, a.labelCls || [], { x: a.x, y: a.y + vh + 0.08, w: a.w, h: Math.max(0.4, (a.h || 1.5) - vh - 0.08) });
  }
  function panel(s, a) {
    const { x, y, w, h, fill = s.c.surface, bar } = a;
    rect(s, { x, y, w, h, fill, line: a.line });
    if (bar === 'top') rect(s, { x, y, w, h: 0.08, fill: a.barColor || s.c.accent });
    if (bar === 'left') rect(s, { x, y, w: 0.08, h, fill: a.barColor || s.c.accent });
    return { x: x + 0.35, y: y + 0.3, w: w - 0.7, h: h - 0.6 };
  }
  // native table: cols = relative widths, head = header strings, rows = arrays of strings. Fills h.
  function table(s, a) {
    const { x, y, w, h, cols, head: hd, rows, size = S.body } = a, rv = (arr) => (rtl ? [...arr].reverse() : arr);
    const tot = cols.reduce((p, q) => p + q, 0), colW = rv(cols).map((c) => (c / tot) * w);
    const hh = 0.5, rh = (h - hh) / rows.length;
    const base = { fontFace: F.body, fontSize: size, color: s.c.ink, valign: 'middle', align: flip('left'), margin: [0, 0.1, 0, 0.1], ...(rtl ? { rtlMode: true, lang: 'ar-SA' } : {}) };
    const line = (c, pt) => [{ type: 'none' }, { type: 'none' }, { pt, color: c }, { type: 'none' }];
    const edge = (i, n) => (i === (rtl ? n - 1 : 0) ? { margin: rtl ? [0, 0, 0, 0.1] : [0, 0.1, 0, 0] } : {});
    // th / td element styles: their text props, background as the cell fill, borderBottom as the row rule
    const el = (k) => { const c = elements[k] || {}; const { align: al, margin, transparency, ...t } = compile(s, c); return { t: { ...t, ...(al ? { align: al } : {}), ...(c.background ? { fill: { color: colour(s, c.background) } } : {}) }, b: c.borderBottom ? stroke(s, c.borderBottom) : null, up: c.textTransform }; };
    const TH = el('th'), TD = el('td');
    // align: ['left','right','right'] per column, written left-to-right like cols (mirrored when rtl). A cell may be {text, color, bold}.
    const al = (j) => (a.align && a.align[j] ? { align: flip(a.align[j]) } : {});
    const ix = (arr) => rv(arr.map((t, j) => [t, j]));
    const out = [ix(hd).map(([t, j], i, arr) => ({ text: rtl || (TH.up && TH.up !== 'uppercase') ? t : t.toUpperCase(), options: { ...base, fontSize: S.small, bold: true, color: s.c.muted, border: TH.b ? line(TH.b.color, TH.b.width) : line(s.c.ink, 1.5), ...edge(i, arr.length), ...TH.t, ...al(j) } }))];
    rows.forEach((r) => out.push(ix(r).map(([c, j], i, arr) => {
      const o = c && typeof c === 'object' ? c : { text: c };
      return { text: o.text, options: { ...base, border: TD.b ? line(TD.b.color, TD.b.width) : line(s.c.rule, 0.75), ...edge(i, arr.length), ...(i === (rtl ? arr.length - 1 : 0) && !elements.td ? { fontFace: F.head, fontSize: S.h2 - 2, bold: !!F.headBold } : {}), ...TD.t, ...al(j), ...(o.color ? { color: colour(s, o.color) } : {}), ...(o.bold ? { bold: true } : {}) } };
    })));
    s.addTable(out, { x: X(x, w), y, w, colW, rowH: [hh, ...rows.map(() => rh)] });
  }
  // items: [{date, label, detail?, at?}] (at = 0..1 position, default evenly spaced). dir 'h' | 'v'.
  // Two items = a span: a bar between large end markers, `span` text ('61 days (derived)') inside it.
  function timeline(s, items, a) {
    const { x, y, w, h, dir = 'h', span } = a, n = items.length, dot = 0.4;
    if (dir === 'v') {
      const ch = h / n;
      rect(s, { x: x + 0.15, y: y + 0.2, w: 0.04, h: h - ch + 0.1, fill: s.c.rule });
      items.forEach((it, i) => {
        const cy = y + i * ch;
        rect(s, { x: x, y: cy + 0.03, w: dot, h: dot, fill: s.c.accent, shape: 'ellipse', line: s.c.bg, lw: 2 });
        raw(s, it.date, { x: x + 0.7, y: cy, w: 2.8, h: 0.5, font: 'head', fontSize: 26 });
        raw(s, it.label, { x: x + 3.7, y: cy + 0.02, w: w - 3.7, h: 0.45, fontSize: 20, bold: true });
        if (it.detail) raw(s, it.detail, { x: x + 3.7, y: cy + 0.5, w: w - 3.7, h: ch - 0.55, color: s.c.muted });
      });
      return;
    }
    const ly = y + (n === 2 ? 0.45 : 0.3);
    if (n === 2) {
      const m = 0.7, bh = span ? 0.5 : 0.16, bw = Math.min(5.4, w / 2 - 0.2);
      rect(s, { x: x + m / 2, y: ly - bh / 2, w: w - m, h: bh, fill: s.c.accent });
      if (span) raw(s, span, { x: x + m, y: ly - bh / 2, w: w - 2 * m, h: bh, fontSize: 18, bold: true, color: s.c.onAccent, align: 'center', valign: 'middle' });
      items.forEach((it, i) => {
        const al = i ? 'end' : 'start', bx = i ? x + w - bw : x;
        rect(s, { x: i ? x + w - m : x, y: ly - m / 2, w: m, h: m, fill: s.c.accent, shape: 'ellipse', line: s.c.bg, lw: 3 });
        raw(s, it.date, { x: bx, y: ly + 0.6, w: bw, h: 0.6, font: 'head', fontSize: 30, align: al });
        raw(s, it.label, { x: bx, y: ly + 1.25, w: bw, h: 0.4, fontSize: 20, bold: true, align: al });
        if (it.detail) raw(s, it.detail, { x: bx, y: ly + 1.75, w: bw, h: Math.max(0.5, h - 2.1), fontSize: 18, color: s.c.muted, align: al });
      });
      return;
    }
    rect(s, { x, y: ly - 0.02, w, h: 0.04, fill: s.c.rule });
    const ats = items.map((it, i) => (it.at !== undefined ? it.at : n === 1 ? 0.5 : i / (n - 1)));
    const gap = Math.min(1, ...ats.slice().sort((p, q) => p - q).map((v, i, arr) => (i ? v - arr[i - 1] : 1)));
    const bw = Math.min(3.6, (gap * w) / 1.6);
    items.forEach((it, i) => {
      const at = ats[i];
      const cx = x + w * at, bx = Math.min(Math.max(cx - bw / 2, x), x + w - bw);
      const edge = at < 0.02 ? 'start' : at > 0.98 ? 'end' : 'center';
      const bxx = edge === 'start' ? x : edge === 'end' ? x + w - bw : bx;
      rect(s, { x: cx - dot / 2, y: ly - dot / 2, w: dot, h: dot, fill: s.c.accent, shape: 'ellipse', line: s.c.bg, lw: 2 });
      raw(s, it.date, { x: bxx, y: ly + 0.45, w: bw, h: 0.55, font: 'head', fontSize: 26, align: edge });
      raw(s, it.label, { x: bxx, y: ly + 1.05, w: bw, h: 0.4, fontSize: 18, bold: true, align: edge });
      if (it.detail) raw(s, it.detail, { x: bxx, y: ly + 1.5, w: bw, h: Math.max(0.5, h - 1.8), color: s.c.muted, align: edge });
    });
  }
  // native bar chart. dir 'bar' (horizontal, first label on top) | 'col'. fmt = Excel format: '$#,##0', '0%' (values as fractions), '#,##0.0'.
  // Pass series:[{name,values}] for several series, or values for one. hi = index to highlight (others turn muted).
  // rtl: columns run right to left (first category at the right) and horizontal bars grow from the right; pass data in reading order.
  function bars(s, a) {
    let { x, y, w, h, labels, values, series, dir = 'bar', fmt = '#,##0', max, hi, colors, name = 'Series', size = 14 } = a;
    const flipCols = rtl && dir === 'col', rv = (arr) => (flipCols ? [...arr].reverse() : arr);
    if (typeof hi === 'string') { const i = labels.indexOf(hi); if (i < 0) throw new Error(`bars: hi "${hi}" is not one of the labels (${labels.join(", ")}); pass a label or a 0-based index`); hi = i; }
    labels = rv(labels);
    if (values) { values = rv(values); if (flipCols && hi !== undefined) hi = values.length - 1 - hi; }
    const ser = (series || [{ name, values }]).map((q) => ({ name: q.name, labels, values: series ? rv(q.values) : q.values }));
    const all = ser.flatMap((q) => q.values), top = Math.max(0, ...all), low = Math.min(0, ...all); // negative values draw below the zero line
    const ce = elements.chart ? compile(s, elements.chart) : {}; // chart element: label font, size and colour
    const cf = ce.fontFace || F.body, cz = ce.fontSize || size, ck = ce.color || s.c.ink;
    const cc = colors || (ser.length > 1 ? [s.c.accent, s.c.accent2, s.c.muted] : hi !== undefined ? values.map((_, i) => (i === hi ? s.c.accent : mix(s.c.bg, s.c.muted, 0.45))) : [s.c.accent]);
    s.addChart(pptx.charts.BAR, ser, {
      x: X(x, w), y, w, h, barDir: dir, chartColors: cc, barGapWidthPct: 55,
      showValue: true, dataLabelFormatCode: fmt, dataLabelPosition: 'outEnd', dataLabelFontFace: cf, dataLabelFontSize: cz, dataLabelColor: ck,
      catAxisLabelFontFace: cf, catAxisLabelFontSize: cz, catAxisLabelColor: ck, catAxisLineShow: false,
      ...(dir === 'bar' ? { catAxisOrientation: 'maxMin', ...(rtl ? { valAxisOrientation: 'maxMin' } : {}) } : {}),
      valAxisHidden: true, valAxisMinVal: low * 1.35, valAxisMaxVal: max || top * 1.18, ...(low < 0 ? { catAxisLabelPos: 'low' } : {}), catGridLine: { style: 'none' }, valGridLine: { style: 'none' },
      showLegend: ser.length > 1, legendPos: 'b', legendFontFace: F.body, legendFontSize: 12, legendColor: s.c.ink,
    });
  }
  // ---- layout arithmetic: boxes are {x, y, w, h} in inches, written left-to-right (drawing mirrors for rtl)
  const page = () => ({ x: M, y: M, w: W - 2 * M, h: 6.65 - M }); // the area above the footer
  // split a box at `at` (0..1 share, or inches if > 1) horizontally ('h': side by side) or vertically ('v': stacked)
  function split(b, at = 0.5, dir = 'h', gap = 0.4) {
    const len = dir === 'h' ? b.w : b.h, a = (at > 1 ? at : (len - gap) * at);
    return dir === 'h' ? [{ ...b, w: a }, { ...b, x: b.x + a + gap, w: b.w - a - gap }] : [{ ...b, h: a }, { ...b, y: b.y + a + gap, h: b.h - a - gap }];
  }
  // n columns (array of relative widths or a count) by rows; returns the cell boxes row by row
  function grid(b, cols = 2, rows = 1, gap = 0.4) {
    const ws = Array.isArray(cols) ? cols : Array(cols).fill(1), tot = ws.reduce((p, q) => p + q, 0);
    const cw = (b.w - gap * (ws.length - 1)), rh = (b.h - gap * (rows - 1)) / rows, out = [];
    for (let r = 0; r < rows; r++) { let x = b.x; ws.forEach((w) => { out.push({ x, y: b.y + r * (rh + gap), w: (cw * w) / tot, h: rh }); x += (cw * w) / tot + gap; }); }
    return out;
  }

  return {
    pptx, T: { ...LIGHT, fonts: F, S, W, H, M }, rtl, X, mix, fit, page, split, grid,
    slide, text: stext, box, stack, rect, rule, line: drawLine, circle, stat, panel, table, timeline, bars,
    save: async (file) => {
      require('fs').mkdirSync(require('path').dirname(file), { recursive: true });
      await pptx.writeFile({ fileName: file });
      const kb = Math.round(require('fs').statSync(file).size / 1024);
      if (!kb) throw new Error('empty pptx');
      console.log(`wrote ${file}: ${pptx.slides.length} slides, ${kb} KB`);
    },
  };
}

module.exports = { deck, PALETTES, FONTS };
