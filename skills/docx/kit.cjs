// Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
// SPDX-License-Identifier: LicenseRef-Proprietary
// docx 9.7.1 kit. A `style` object written as CSS compiles to real Word styles (classes appear in Word's style gallery,
// `composes` becomes basedOn). Mechanics: real headings with native numbering, tables with header rows, footnotes,
// equations from TeX, numbered captions and cross-references, sections with their own page numbering, a contents page,
// RTL. API in SKILL.md.
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, PageNumber,
  Header, Footer, LevelFormat, TabStopType, HeadingLevel, TableLayoutType, VerticalAlign } = D;

// Colour and font presets; a style's variables override them. th: solid | tint | rule (table header look); rule: line under Title/Heading 1.
const THEMES = {
  navy:   { accent: '1B3A63', ink: '16202C', muted: '5E6978', tint: 'E8EEF6', line: 'C9D2DE', head: 'Times New Roman', body: 'Arial', th: 'solid', rule: true },
  forest: { accent: '1F6B4A', ink: '18221D', muted: '5F6C65', tint: 'E9F3EE', line: 'CAD8CF', head: 'Arial', body: 'Arial', th: 'tint', rule: false },
  clay:   { accent: 'B4472B', ink: '2A211D', muted: '7A6A62', tint: 'F8ECE5', line: 'E4D3C9', head: 'Times New Roman', body: 'Times New Roman', th: 'rule', rule: true },
  slate:  { accent: '2B2F36', ink: '1B1D21', muted: '6A6F78', tint: 'EEF0F2', line: 'D2D5DA', head: 'Arial', body: 'Arial', th: 'solid', rule: false },
};
const PAGES = { A4: [11906, 16838], Letter: [12240, 15840], A5: [8391, 11906], B5: [9979, 14173] };
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const line = (color, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
// Word has these everywhere and LibreOffice renders them with metric-compatible faces; other names get substituted.
const SAFE = ['Arial', 'Arial Narrow', 'Times New Roman', 'Courier New', 'Tahoma', 'Sakkal Majalla', 'Traditional Arabic', 'Simplified Arabic', 'Noto Naskh Arabic', 'Noto Sans Arabic'];
const GENERIC = { serif: 'Times New Roman', 'sans-serif': 'Arial', monospace: 'Courier New' };
const ELEMENTS = ['body', 'title', 'subtitle', 'h1', 'h2', 'h3', 'caption', 'footnote', 'th', 'td', 'header', 'footer', 'contentsTitle', 'toc1', 'toc2', 'toc3'];
const PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'color', 'lineHeight', 'letterSpacing', 'textTransform', 'textDecoration', 'textAlign', 'textIndent',
  'background', 'padding', 'border', 'borderTop', 'borderBottom', 'borderInlineStart', 'borderInlineEnd', 'marginTop', 'marginBottom', 'marginInlineStart', 'marginInlineEnd', 'breakBefore', 'breakAfter', 'breakInside', 'composes', 'docx'];
const NOT_HERE = { borderRadius: 'Word paragraphs and tables have square corners', display: 'Word flows text: use d.section({columns}) or a table for real tabular data', gridTemplateColumns: 'use d.section({columns: 2}) for text columns or a table for data', flex: 'Word flows text top to bottom', gap: 'use marginTop and marginBottom', width: 'a paragraph spans the text column; narrow it with marginInlineStart and marginInlineEnd', height: 'Word sizes paragraphs from their content', boxShadow: 'Word paragraphs have no shadow', margin: 'use marginTop, marginBottom, marginInlineStart, marginInlineEnd', opacity: 'choose a lighter colour', position: 'Word flows text top to bottom' };
const lev = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };

// ---- equations: a TeX subset compiled to native Word math
const SYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', cdot: '⋅', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', emptyset: '∅', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftrightarrow: '⇔', mapsto: '↦', ldots: '…', cdots: '⋯', qed: '∎', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', ln: 'ln', exp: 'exp', lim: 'lim', max: 'max', min: 'min', det: 'det', quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ' ': ' ', '{': '{', '}': '}', '%': '%', '$': '$', '#': '#', '&': '&', '_': '_' };
// upright text inside an equation (m:nor). The package's MathRun only writes slanted maths letters and lets Word trim spaces.
const plain = (text) => new D.BuilderElement({ name: 'm:r', children: [
  new D.BuilderElement({ name: 'm:rPr', children: [new D.BuilderElement({ name: 'm:nor' })] }),
  new D.BuilderElement({ name: 'm:t', attributes: { space: { key: 'xml:space', value: 'preserve' } }, children: [text] }),
] });
const FUNCS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'det']);
function tex(src) {
  let i = 0; const s = String(src);
  const fail = (m) => { throw new Error(`equation "${s}": ${m}`); };
  const ws = () => { while (s[i] === ' ') i++; };
  const group = () => { ws(); if (s[i] === '{') { i++; const g = seq('}'); if (s[i] !== '}') fail('missing }'); i++; return g; } const a = atom(); return a ? [a] : []; };
  const atom = () => {
    ws(); const c = s[i]; if (c === undefined || c === '}') return null;
    if (c === '{') return { group: group() };
    if (c === '\\') {
      i++; let m = (s.slice(i).match(/^[A-Za-z]+/) || [''])[0]; if (!m) m = s[i] || ''; i += m.length;
      if (m === 'frac') { const numerator = group(), denominator = group(); return new D.MathFraction({ numerator, denominator }); }
      if (m === 'sqrt') { ws(); let degree; if (s[i] === '[') { const e = s.indexOf(']', i); degree = [new D.MathRun(s.slice(i + 1, e))]; i = e + 1; } return new D.MathRadical({ children: group(), ...(degree ? { degree } : {}) }); }
      if (m === 'sum' || m === 'int') { let subScript, superScript; for (let k = 0; k < 2; k++) { ws(); if (s[i] === '_') { i++; subScript = group(); } else if (s[i] === '^') { i++; superScript = group(); } } const body = term() || []; const Cls = m === 'sum' ? D.MathSum : D.MathIntegral; return new Cls({ children: body, ...(subScript ? { subScript } : {}), ...(superScript ? { superScript } : {}) }); }
      if (m === 'text' || m === 'mathrm') { ws(); if (s[i] !== '{') fail(`\\${m} needs {…}`); const e = s.indexOf('}', i); const t = s.slice(i + 1, e); i = e + 1; return plain(t); }
      if (m === 'left' || m === 'right') return atom();
      if ((m === 'lim' || m === 'max' || m === 'min') && (ws(), s[i] === '_')) { i++; return new D.MathLimitLower({ children: [plain(m)], limit: group() }); }
      if (FUNCS.has(m)) return plain(m);
      if (SYM[m] !== undefined) return new D.MathRun(SYM[m]);
      fail(`unknown command \\${m}; supported: \\frac \\sqrt \\sum \\int \\text \\left \\right and ${Object.keys(SYM).filter((k) => k.length > 1).map((k) => '\\' + k).join(' ')}. For anything else build D.Math objects and pass them through d.add`);
    }
    i++; return new D.MathRun(c);
  };
  // one atom with its sub and superscript
  const term = () => {
    let a = atom(); if (!a) return null; if (a.group) a = a.group.length === 1 ? a.group[0] : { list: a.group };
    let sub, sup;
    for (let k = 0; k < 2; k++) { ws(); if (s[i] === '_' && !sub) { i++; sub = group(); } else if (s[i] === '^' && !sup) { i++; sup = group(); } }
    const base = a.list || [a];
    if (sub && sup) return [new D.MathSubSuperScript({ children: base, subScript: sub, superScript: sup })];
    if (sup) return [new D.MathSuperScript({ children: base, superScript: sup })];
    if (sub) return [new D.MathSubScript({ children: base, subScript: sub })];
    return base;
  };
  const seq = (end) => {
    const out = [];
    for (;;) {
      ws(); if (i >= s.length || s[i] === end) return out;
      const t = term(); if (!t) return out;
      out.push(...t);
    }
  };
  const res = seq(); if (i < s.length) fail(`unexpected "${s[i]}"`);
  return res;
}

const sniffSize = (buf) => { // [w, h] of a PNG or JPEG
  if (buf[0] === 0x89) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  for (let i = 2; i < buf.length - 9;) { if (buf[i] !== 0xff) { i++; continue; } const m = buf[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]; i += 2 + buf.readUInt16BE(i + 2); }
  return null;
};

// raw package options win over what the kit set: plain objects merge, anything else replaces
const isPlain = (x) => x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype;
const deep = (a, b) => { const out = { ...a }; for (const [k, v] of Object.entries(b)) out[k] = isPlain(a[k]) && isPlain(v) ? deep(a[k], v) : v; return out; };

function doc(o = {}) {
  const style = o.style || {}, sv = (k) => (style[`--${k}`] !== undefined ? String(style[`--${k}`]).replace('#', '') : undefined);
  if (!o.theme && !sv('accent')) throw new Error(`choose the colours for this document: style {'--accent': '#…', …}, or theme (${Object.keys(THEMES).join(' ')})`);
  if (o.theme && !THEMES[o.theme]) throw new Error(`unknown theme ${o.theme}: ${Object.keys(THEMES).join(' ')}, or set --accent in style`);
  const t = { ...THEMES.slate, th: 'rule', rule: false, ...(o.theme ? THEMES[o.theme] : {}) };
  for (const k of ['accent', 'ink', 'muted', 'tint', 'line']) if (sv(k)) t[k] = sv(k);
  const rtl = !!o.rtl, den = o.density || 1, classes = {}, elements = {}, warned = new Set();
  const warn = (m) => { if (!warned.has(m)) { warned.add(m); console.log('WARN ' + m); } };
  for (const [k, v] of Object.entries(style)) {
    if (k.startsWith('--')) continue;
    if (k.startsWith('.')) classes[k.slice(1)] = v;
    else if (ELEMENTS.includes(k)) elements[k] = v;
    else throw new Error(`style: "${k}" is not a variable (--name), a class (.name) or an element (${ELEMENTS.join(' ')})`);
  }
  const check = (props) => Object.keys(props).forEach((k) => {
    if (PROPS.includes(k)) return;
    if (NOT_HERE[k]) throw new Error(`style: ${k} is CSS but not something a Word paragraph can do: ${NOT_HERE[k]}`);
    throw new Error(`style: unknown property ${k} (did you mean ${PROPS.map((p) => [p, lev(k, p)]).sort((a, b) => a[1] - b[1])[0][0]}?); supported: ${PROPS.join(' ')}`);
  });
  Object.values(classes).concat(Object.values(elements)).forEach(check);
  // lengths: 12 (points) | '12pt' | '4mm' | '1in' | '16px' | var(--x) -> twips
  const val = (v) => { for (let i = 0; i < 4 && typeof v === 'string'; i++) { const m = v.trim().match(/^var\(--([\w-]+)\)$/), k = m ? m[1] : v.trim(); if (style[`--${k}`] === undefined) break; v = style[`--${k}`]; } return v; };
  const tw = (v) => { v = val(v); if (typeof v === 'number') return Math.round(v * 20); const m = String(v).trim().match(/^(-?[\d.]+)\s*(pt|mm|cm|in|px)?$/); if (!m) throw new Error(`style: not a length: ${v}`); const n = +m[1]; return Math.round({ pt: n * 20, mm: n * 1440 / 25.4, cm: n * 14400 / 25.4, in: n * 1440, px: n * 15 }[m[2] || 'pt']); };
  const colour = (v) => { let x = String(v).trim(); const m = x.match(/^var\(--([\w-]+)\)$/); if (m) x = m[1]; if (style[`--${x}`] !== undefined) x = String(style[`--${x}`]); else if (t[x] && !['head', 'body', 'th', 'rule'].includes(x)) return t[x]; x = x.replace('#', ''); if (/^[0-9a-f]{3}$/i.test(x)) x = x.split('').map((c) => c + c).join(''); if (!/^[0-9a-f]{6}$/i.test(x)) throw new Error(`style: colour ${v} must be #RRGGBB or a --variable`); return x.toUpperCase(); };
  const face = (v) => { const list = (Array.isArray(v) ? v : String(v).split(',')).map((f) => String(f).trim().replace(/^["']|["']$/g, '')).map((f) => GENERIC[f] || f); const want = list.find((f) => !(rtl && f === 'Arial Narrow')); if (!want) return o.csFont || 'Arial'; if (!SAFE.includes(want)) warn(`font ${want} is not on every machine: Word and LibreOffice substitute it where it is missing, which moves the layout. Safe: ${SAFE.join(', ')}`); return want; };   // a Word file stores one name per run, so the first wish is the font
  const font = (f) => ({ ascii: f, hAnsi: f, eastAsia: f, cs: f });
  if (rtl && o.csFont) { t.body = o.csFont; t.head = o.csFont; }
  if (elements.body && elements.body.fontFamily) { t.body = face(elements.body.fontFamily); if (!o.theme) t.head = t.body; }   // headings follow the body face until h1… says otherwise
  const stroke = (v, space) => { if (String(v).trim() === 'none') return NONE; const m = String(v).trim().split(/\s+/).filter((x) => !/^(solid|dashed|dotted|double)$/.test(x)); const isLen = (x) => { try { tw(x); return true; } catch { return false; } }; const w = m.find(isLen); return { style: BorderStyle.SINGLE, size: Math.max(2, Math.round((w ? tw(w) : 20) / 20 * 8)), color: colour(m.find((x) => x !== w) || 'line'), space: space ?? 1 }; };
  /** resolved CSS props -> { run, paragraph } options for a Word style or a direct format */
  const compile = (c) => {
    const run = {}, p = {}, spacing = {}, indent = {}, border = {};
    if (c.fontFamily) run.font = font(face(c.fontFamily));
    if (c.fontSize !== undefined) { const pt = tw(c.fontSize) / 20; run.size = Math.round(pt * 2); if (pt < 8.5) warn(`fontSize ${pt}pt is below the 8.5pt reading floor`); }
    if (c.fontWeight !== undefined) run.bold = c.fontWeight === 'bold' || +c.fontWeight >= 600;
    if (c.fontStyle) { if (rtl && c.fontStyle === 'italic') warn('italic ignored in right-to-left text'); else run.italics = c.fontStyle === 'italic'; }
    if (c.fontVariant === 'small-caps') run.smallCaps = true;
    if (c.color) run.color = colour(c.color);
    if (c.letterSpacing !== undefined) { if (rtl) warn('letterSpacing ignored in right-to-left text (it breaks letter joining)'); else { const em = String(val(c.letterSpacing)).trim().match(/^(-?[\d.]+)em$/); run.characterSpacing = em ? Math.round(+em[1] * (c.fontSize !== undefined ? tw(c.fontSize) : (o.size || 21) * 10)) : tw(c.letterSpacing); } }
    if (c.textTransform === 'uppercase' && !rtl) run.allCaps = true;
    if (c.textDecoration === 'underline') run.underline = {};
    if (c.textAlign) p.alignment = { start: AlignmentType.START, end: AlignmentType.END, center: AlignmentType.CENTER, justify: AlignmentType.JUSTIFIED, left: AlignmentType.LEFT, right: AlignmentType.RIGHT }[c.textAlign];
    if (c.lineHeight) spacing.line = Math.round(240 * +c.lineHeight);
    if (c.marginTop !== undefined) spacing.before = tw(c.marginTop);
    if (c.marginBottom !== undefined) spacing.after = tw(c.marginBottom);
    if (c.marginInlineStart !== undefined) indent.start = tw(c.marginInlineStart);
    if (c.marginInlineEnd !== undefined) indent.end = tw(c.marginInlineEnd);
    if (c.textIndent !== undefined) { const v = tw(c.textIndent); if (v < 0) indent.hanging = -v; else indent.firstLine = v; }
    if (c.background) p.shading = { type: ShadingType.CLEAR, color: 'auto', fill: colour(c.background) };
    const space = c.padding !== undefined ? Math.round(tw(String(c.padding).split(/\s+/)[0]) / 20) : undefined;
    if (c.border) for (const k of ['top', 'bottom', 'left', 'right']) border[k] = stroke(c.border, space);
    const [st, en] = rtl ? ['right', 'left'] : ['left', 'right'];
    if (c.borderTop) border.top = stroke(c.borderTop, space);
    if (c.borderBottom) border.bottom = stroke(c.borderBottom, space);
    if (c.borderInlineStart) border[st] = stroke(c.borderInlineStart, space);
    if (c.borderInlineEnd) border[en] = stroke(c.borderInlineEnd, space);
    if (c.breakBefore === 'page') p.pageBreakBefore = true;
    if (c.breakAfter === 'avoid') p.keepNext = true;
    if (c.breakInside === 'avoid') p.keepLines = true;
    if (Object.keys(spacing).length) p.spacing = spacing;
    if (Object.keys(indent).length) p.indent = indent;
    if (Object.keys(border).length) p.border = border;
    return { run: { ...run, ...(c.docx && c.docx.run) }, paragraph: { ...p, ...(c.docx && c.docx.paragraph) } };
  };
  const merge = (base, extra) => ({ run: { ...base.run, ...extra.run }, paragraph: { ...base.paragraph, ...extra.paragraph, spacing: { ...(base.paragraph && base.paragraph.spacing), ...(extra.paragraph && extra.paragraph.spacing) }, indent: { ...(base.paragraph && base.paragraph.indent), ...(extra.paragraph && extra.paragraph.indent) } } });
  // a textIndent on body reaches running text only: everything the kit lays out itself starts flush
  const FLUSH = { firstLine: 0 };
  const el = (k, base) => (elements[k] ? merge(base, compile(elements[k])) : base);
  const clsId = (n) => 'c_' + n.replace(/[^\w-]/g, '_');
  const flatClass = (n) => { const c = classes[n] || {}; return { ...[].concat(c.composes || []).reduce((acc, x) => ({ ...acc, ...flatClass(String(x).replace(/^\./, '')) }), {}), ...c }; };
  const clsName = (c) => { const names = [].concat(c || []).flatMap((x) => String(x).split(/\s+/)).filter(Boolean).map((x) => x.replace(/^\./, '')); if (names.length > 1) throw new Error(`Word paragraphs take one style: use one class, or a class that composes the others (${names.join(', ')})`); if (names[0] && !classes[names[0]]) throw new Error(`style: no class .${names[0]}; defined: ${Object.keys(classes).map((x) => '.' + x).join(' ') || '(none)'}`); return names[0]; };

  const body = o.size || (elements.body && elements.body.fontSize !== undefined ? Math.round(tw(elements.body.fontSize) / 10) : Math.round(21 * (1 + 0.12 * (den - 1))));       // half-points (21 = 10.5pt)
  if (o.page !== undefined && !Array.isArray(o.page) && !PAGES[o.page]) throw new Error(`page: ${o.page} is not a size: ${Object.keys(PAGES).join(' ')}, or a trim as [width, height], e.g. ['6in', '9in']`);
  const [pw, ph] = Array.isArray(o.page) ? o.page.map(tw) : PAGES[o.page || 'A4'], gutter = o.gutter !== undefined ? tw(o.gutter) : 0;
  // margin: one length, or { top, bottom, left | inside, right | outside }; 1247 twips = 2.2 cm
  const mo = o.margin && typeof o.margin === 'object' ? o.margin : {}, m0 = o.margin !== undefined && typeof o.margin !== 'object' ? tw(o.margin) : 1247;
  Object.keys(mo).forEach((k) => { if (!['top', 'bottom', 'left', 'right', 'inside', 'outside'].includes(k)) throw new Error(`margin: unknown side ${k}; use top bottom left right inside outside`); });
  const side = (...k) => { const v = k.map((x) => mo[x]).find((x) => x !== undefined); return v !== undefined ? tw(v) : m0; };
  const mar = { top: side('top'), bottom: side('bottom'), left: side('left', 'inside'), right: side('right', 'outside') };
  // spread: spacing-only multiplier (fonts unchanged); check.py --fit sets it through DOCX_SPREAD to fill a fixed page count
  const spread = +(process.env.DOCX_SPREAD || o.spread || 1);
  const W = pw - mar.left - mar.right - gutter, hz = (v) => Math.round(v * den * spread);
  const al = (a) => (a === 'r' || a === 'e' ? AlignmentType.END : a === 'c' ? AlignmentType.CENTER : AlignmentType.START);
  const LBL = rtl ? { figure: 'شكل', table: 'جدول', section: 'القسم', page: ['صفحة ', ' من '] } : { figure: 'Figure', table: 'Table', section: 'Section', page: ['Page ', ' of '] };

  // ---- deferred content: paragraphs are built at save time so cross-references may point forward
  const sections = [{ opts: {}, kids: [] }]; let kids = sections[0].kids, nlist = 0;
  const numbering = [], notes = {}, maths = [], labels = {}, heads = []; let noteId = 0, lastRec = null, usedToc = false, evenUsed = !!o.headerEven || !!o.mirror, measuring = false;
  const chapterStart = o.chapterStart || 1;
  const chapterText = o.chapterLabel ? (String(o.chapterLabel).includes('%1') ? String(o.chapterLabel) : `${o.chapterLabel} %1`) : '%1';
  const cnt = { h: [chapterStart - 1, 0, 0], figure: 0, table: 0, eq: 0 };
  const hidden = (x) => new TextRun({ ...x, size: 2, color: 'FFFFFF' });   // only in the measuring pass, never in the saved file
  const headMark = (h) => `ZQH${h.id.slice(2)}ZQ`;
  const chapter = () => (o.chapterNumbers && cnt.h[0] ? `${cnt.h[0]}.` : '');
  const bm = (label) => 'r_' + String(label).replace(/[^\w-]/g, '_');
  const tok = (k, v) => `${k}:${v}`;

  // inline: **bold**, *italic*, and the tokens from note(), m() and ref()
  const runs = (text, r = {}) => String(text).split(/([^]*|\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).flatMap((s) => {
    if (s[0] === '') {
      const [k, v] = s.slice(1, -1).split(/:(.*)/s);
      if (k === 'n') return [new D.FootnoteReferenceRun(+v)];
      if (k === 'm') return [new D.Math({ children: tex(maths[+v]) })];
      if (!labels[v]) throw new Error(`d.ref("${v}"): no such label; defined: ${Object.keys(labels).join(' ') || '(none)'}`);
      return [new D.InternalHyperlink({ anchor: bm(v), children: [new TextRun({ text: labels[v], rightToLeft: rtl || undefined })] })];
    }
    const b = s.startsWith('**'), i = !b && s.startsWith('*') && s.length > 2;
    return [new TextRun({ ...r, text: b ? s.slice(2, -2) : i ? s.slice(1, -1) : s, bold: b || r.bold, italics: i || r.italics, rightToLeft: rtl || undefined })];
  });
  const para = (text, p = {}, r = {}) => new Paragraph({ ...p, bidirectional: rtl || undefined, children: Array.isArray(text) ? text : runs(text, r) });

  const add = (...x) => { kids.push(...x); return api; };
  /** a deferred paragraph: cls + inline CSS over the given paragraph options */
  const rec = (text, base, cls, inline, label) => {
    if (cls && typeof cls === 'object' && !Array.isArray(cls)) { inline = cls; cls = ''; }
    const { number: _n, label: _l, ...css } = inline || {}; check(css);
    // on a paragraph with its own style (heading, title, caption, small) a class adds to that style, as in CSS; elsewhere it is the paragraph's Word style
    const name = clsName(cls), own = base.heading || base.style, dir = compile({ ...(name && own ? flatClass(name) : {}), ...css });
    const r = { text, label, opts: { ...base, ...(name && !own ? { style: clsId(name) } : {}), ...dir.paragraph }, run: dir.run };
    r.build = () => { const inner = runs(r.text, r.run); return new Paragraph({ ...r.opts, bidirectional: rtl || undefined, children: r.label ? [new D.Bookmark({ id: bm(r.label), children: inner })] : inner }); };
    lastRec = r; add(r); return api;
  };
  const stripMarks = (s) => String(s).replace(/[^]*/g, '').replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, '$1$2');
  const intro = () => { const last = kids[kids.length - 1]; if (last && last === lastRec && String(last.text).length <= 300) last.opts.keepNext = true; };
  const heading = (lvl) => (s, cls, inline) => {
    if (cls && typeof cls === 'object' && !Array.isArray(cls)) { inline = cls; cls = ''; }
    const { number = true, label } = inline || {}, num = o.numberHeadings && number;
    let prefix = '';
    if (num) { cnt.h[lvl]++; for (let i = lvl + 1; i < 3; i++) cnt.h[i] = 0; const n = cnt.h.slice(0, lvl + 1).join('.'); prefix = lvl === 0 ? chapterText.replace('%1', n) : n; if (lvl === 0 && o.chapterNumbers) { cnt.figure = 0; cnt.table = 0; cnt.eq = 0; } }
    const lb = label || null, hd = { lvl, title: stripMarks(s), prefix, id: `h_${heads.length}`, anchor: lb ? bm(lb) : `h_${heads.length}` }; heads.push(hd);
    if (lb) labels[lb] = !prefix ? stripMarks(s) : lvl === 0 && o.chapterLabel ? prefix.replace(/[\s:.–-]+$/, '') : `${LBL.section} ${prefix}`;
    rec(s, { heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][lvl], keepNext: true, ...(num ? { numbering: { reference: 'hd', level: lvl } } : {}) }, cls, inline);
    const r = kids[kids.length - 1], build0 = r.build;
    r.build = () => { if (!usedToc && !lb) return build0(); const inner = runs(r.text, r.run); if (measuring) inner.unshift(hidden({ text: headMark(hd) })); return new Paragraph({ ...r.opts, bidirectional: rtl || undefined, children: [new D.Bookmark({ id: hd.anchor, children: inner })] }); };
    return api;
  };
  const captionOf = (kind, text, label, cls) => {
    cnt[kind]++; const n = `${chapter()}${cnt[kind]}`, tag = `${LBL[kind]} ${n}`;
    if (label) labels[label] = tag;
    return rec(`**${tag}.** ${text}`, { style: 'Caption' }, cls, undefined, label);
  };

  // ---- table
  const cell = (text, w, c = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, shading: c.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: c.fill } : undefined,
    margins: { top: hz(c.pad ?? 90), bottom: hz(c.pad ?? 90), left: 120, right: 120 }, borders: { top: c.top || NONE, bottom: c.bottom || NONE, left: NONE, right: NONE, ...c.borders },
    children: (Array.isArray(text) ? text : [text]).map((x) => (typeof x === 'string'
      ? para(x, { style: 'TableText', alignment: al(c.al), keepNext: c.keep, keepLines: true }, { bold: c.bold, color: c.color, size: c.size })
      : x)),
  });
  const row = (cells, hdr) => new TableRow({ children: cells, tableHeader: hdr, cantSplit: true });
  const tbl = (rows, widths) => new Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, visuallyRightToLeft: rtl || undefined });
  const split = (rel) => { const s = rel.reduce((a, b) => a + b, 0); const w = rel.map((x) => Math.floor(W * x / s)); w[w.length - 1] += W - w.reduce((a, b) => a + b, 0); return w; };

  const api = {
    t, W, rtl, runs, para, get kids() { return kids; },
    add,
    title: (s, cls, inline) => rec(s, { heading: HeadingLevel.TITLE }, cls, inline),
    subtitle: (s, cls, inline) => rec(s, { style: 'Subtitle' }, cls, inline),
    h1: heading(0), h2: heading(1), h3: heading(2),
    p: (s, cls, inline) => rec(s, {}, cls, inline),
    small: (s, cls, inline) => rec(s, { style: 'Small' }, cls, inline),
    pageBreak: () => add(new Paragraph({ pageBreakBefore: true, indent: FLUSH, children: [] })),
    gap: () => add(new Paragraph({ style: 'Gap', children: [] })),
    bullets: (items, cls) => { items.forEach((s) => rec(s, { numbering: { reference: 'bul', level: 0 }, spacing: { after: hz(60) } }, cls)); return api; },
    numbered: (items, cls) => { const ref = 'num' + ++nlist; numbering.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { run: { bold: true, color: t.accent }, paragraph: { indent: { left: 460, hanging: 340 } } } }] }); items.forEach((s) => rec(s, { numbering: { reference: ref, level: 0 }, spacing: { after: hz(60) } }, cls)); return api; },
    // left text, right text on one line using a right tab stop at the margin
    tabline: (l, r, p = {}) => add(new Paragraph({ indent: FLUSH, ...p, bidirectional: rtl || undefined, tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [...runs(l), new TextRun({ text: '\t' }), ...runs(r)] })),

    // ---- inline tokens: put the returned string inside any text
    /** footnote: d.p(`A claim.${d.note('Its source.')}`) */
    note: (text) => { const id = ++noteId; notes[id] = text; return tok('n', id); },
    /** inline equation from TeX: d.p(`where ${d.m('x^2')} is …`) */
    m: (src) => { tex(src); maths.push(src); return tok('m', maths.length - 1); },
    /** cross-reference to a label (Figure 3, Table 2, Section 1.2, or an equation number); may point forward */
    ref: (label) => tok('r', label),

    /** display equation from TeX; numbered when { number: true } or a label is given */
    eq(src, { label, number = !!label } = {}) {
      tex(src);
      let tag = '';
      if (number) { cnt.eq++; tag = `(${chapter()}${cnt.eq})`; if (label) labels[label] = tag; }
      // m:oMathPara is what makes Word set a full display equation; with anything else in its paragraph (a tab, a number) Word shrinks it to inline size.
      // So a numbered equation is a borderless table: blank, equation, number. The equation always runs left to right; the table's own direction puts the number on the left in RTL.
      const cols = sections[sections.length - 1].opts.columns, width = cols ? Math.floor((W - 480 * (cols - 1)) / cols) : W;
      add({ build: () => {
        const eqPara = () => new Paragraph({ indent: FLUSH, spacing: { before: hz(120), after: hz(120) }, keepLines: true, children: [new D.BuilderElement({ name: 'm:oMathPara', children: [new D.Math({ children: tex(src) })] })] });
        if (!tag) return eqPara();
        const side = Math.round(width * 0.12), w = [side, width - 2 * side, side], run = new TextRun({ text: tag });
        const num = new Paragraph({ indent: FLUSH, alignment: AlignmentType.END, spacing: { after: 0 }, children: [label ? new D.Bookmark({ id: bm(label), children: [run] }) : run] });
        return tbl([row([cell('', w[0], { pad: 0 }), cell([eqPara()], w[1], { pad: 0 }), cell([num], w[2], { pad: 0 })])], w);
      } });
      return api;
    },
    /** image with a numbered caption below: figure('a.png', { width: '120mm', caption, label }) */
    figure(file, { width, height, caption, label, align = 'c' } = {}) {
      const buf = fs.readFileSync(file), ext = path.extname(file).slice(1).toLowerCase().replace('jpeg', 'jpg');
      if (!['png', 'jpg', 'gif', 'bmp'].includes(ext)) throw new Error(`figure: ${ext} is not an image type Word embeds here; use png or jpg`);
      const size = sniffSize(buf), wpx = Math.round((width ? tw(width) : W) / 15);
      const hpx = height ? Math.round(tw(height) / 15) : size ? Math.round(wpx * size[1] / size[0]) : null;
      if (!hpx) throw new Error(`figure: give a height for ${file}`);
      add(new Paragraph({ indent: FLUSH, alignment: al(align), keepNext: !!caption, spacing: { before: hz(120), after: hz(60) }, bidirectional: rtl || undefined, children: [new D.ImageRun({ type: ext, data: buf, transformation: { width: wpx, height: hpx }, altText: { name: path.basename(file), title: caption || path.basename(file), description: caption || path.basename(file) } })] }));
      if (caption) captionOf('figure', caption, label);
      return api;
    },
    // table({head:[..], rows:[[..]], widths:[3,1], align:'lr', total:true, caption:'...', label:'t-budget'}); the caption goes above and is numbered
    table({ head, rows, widths, align, total, caption, label, zebra, keep = true, firstBold = true }) {
      intro();
      if (caption) { captionOf('table', caption, label); kids[kids.length - 1].opts.keepNext = true; }
      const n = head.length, w = split(widths || head.map(() => 1)), a = align || 'l'.repeat(n);
      const all = [head, ...rows], kn = keep && all.length <= 14;
      const hs0 = { solid: { fill: t.accent, color: 'FFFFFF', bottom: null }, tint: { fill: t.tint, color: t.accent, bottom: line(t.accent, 8) }, rule: { fill: null, color: t.accent, bottom: line(t.accent, 8) } }[t.th];
      const TH = elements.th || {}, TD = elements.td || {};
      const hs = { ...hs0, ...(TH.background ? { fill: colour(TH.background) } : {}), ...(TH.color ? { color: colour(TH.color) } : {}), ...(TH.borderBottom ? { bottom: stroke(TH.borderBottom) } : {}) };
      const tdBottom = TD.borderBottom ? stroke(TD.borderBottom) : line(t.line, 4), tdc = TD.color ? colour(TD.color) : undefined, tds = TD.fontSize !== undefined ? Math.round(tw(TD.fontSize) / 10) : undefined;
      const ths = TH.fontSize !== undefined ? Math.round(tw(TH.fontSize) / 10) : body - 3, thb = TH.fontWeight !== undefined ? TH.fontWeight === 'bold' || +TH.fontWeight >= 600 : true;
      const trs = all.map((r, i) => {
        const last = i === all.length - 1, hd = i === 0, tot = total && last;
        return row(r.map((x, j) => cell(x, w[j], {
          al: a[j], bold: hd ? thb : tot || (firstBold && j === 0), keep: kn && !last, color: hd ? hs.color : tdc, size: hd ? ths : tds,
          fill: hd ? hs.fill : tot ? t.tint : zebra && i % 2 === 0 ? t.tint : undefined, bottom: hd ? hs.bottom : tdBottom, top: tot ? line(t.accent, 8) : undefined, pad: hd ? 100 : 90,
        })), hd);
      });
      add(tbl(trs, w));
      return api.gap();
    },
    /** contents from the headings, under a visible title (false for none); page numbers come from a LibreOffice pass at save and Word can refresh them */
    contents(title, { levels = 3, cls } = {}) { usedToc = true; if (title !== false) rec(title ?? (rtl ? 'المحتويات' : 'Contents'), { style: 'ContentsTitle' }, cls); add({ toc: true, levels }); return api; },
    /** start a new section: { numbering: 'roman' | 'Roman' | 'decimal' | 'alpha', start, columns, footer, header, headerEven, pageLabel: 'of' | 'number' | 'none', continuous, oddPage, firstPage: 'plain' } */
    section(opts = {}) {
      if (opts.headerEven) evenUsed = true;
      lastRec = null;
      if (!kids.length) { sections[sections.length - 1].opts = opts; return api; } // nothing yet: this section replaces the empty one, no blank page
      const prev = sections[sections.length - 1].opts;   // the number format carries on, or Word falls back to decimal
      sections.push({ opts: { numbering: prev.numbering, ...opts }, kids: [] }); kids = sections[sections.length - 1].kids;
      return api;
    },

    async save(file) {
      const pass = (pageOf) => {
        class Contents extends D.TableOfContents { getTabStopsForLevel(level) { return super.getTabStopsForLevel(level, W); } }   // the package assumes a 9025-twip line
        const flat = (arr) => arr.map((k) => { if (k && k.toc) return new Contents(rtl ? 'المحتويات' : 'Contents', { hyperlink: true, headingStyleRange: `1-${k.levels}`, beginDirty: false, cachedEntries: heads.filter((h) => h.lvl < k.levels).map((h) => ({ title: (h.prefix ? h.prefix + ' ' : '') + h.title, level: h.lvl + 1, page: pageOf ? pageOf(h) : undefined, href: h.anchor })) }); return k && k.build ? k.build() : k; });
        const fmt = { roman: D.NumberFormat.LOWER_ROMAN, Roman: D.NumberFormat.UPPER_ROMAN, decimal: D.NumberFormat.DECIMAL, alpha: D.NumberFormat.LOWER_LETTER };
        const mk = (txt) => new TextRun({ text: txt, rightToLeft: rtl || undefined });
        const pageRun = (kind) => new TextRun({ children: [kind] });
        // the measuring pass prints each page's own number, as its section shows it, in the footer
        // (at 6pt: smaller, and the text extractor separates the number from its mark)
        const pageMark = () => (measuring ? [new TextRun({ children: ['ZQP', PageNumber.CURRENT, 'ZQ'], size: 12, color: 'FFFFFF' })] : []);
        const footerOf = (s) => {
          const set = (P) => ({ default: new Footer({ children: [P(false)] }), ...(evenUsed ? { even: new Footer({ children: [P(true)] }) } : {}), ...(s.firstPage ? { first: new Footer({ children: [P(false)] }) } : {}) });
          if ((s.footer ?? o.footer) === false) return set(() => new Paragraph({ border: { top: NONE }, children: pageMark() }));   // Word draws the Footer style's rule otherwise   // an empty footer: with none at all, Word inherits the previous section's
          const label = s.pageLabel || (s.numbering ? 'number' : o.pageLabel || 'of');
          const nums = () => (label === 'none' ? [] : label === 'number' ? [pageRun(PageNumber.CURRENT)] : [mk(LBL.page[0]), pageRun(PageNumber.CURRENT), mk(LBL.page[1]), pageRun(PageNumber.TOTAL_PAGES)]);
          const text = () => mk(s.footer ?? o.footer ?? o.title ?? ''), tab = () => new TextRun({ text: '\t' });
          return set((even) => new Paragraph({ style: 'Footer', bidirectional: rtl || undefined, tabStops: [{ type: TabStopType.RIGHT, position: W }], spacing: { before: 0, after: 0 },
            children: [...(even && o.mirror ? [...nums(), tab(), text()] : [text(), tab(), ...nums()]), ...pageMark()] }));   // mirrored: the number stays on the outer edge
        };
        const headerOf = (s) => {
          const off = s.header === false, txt = off ? '' : s.header ?? o.header, even = off ? '' : s.headerEven ?? o.headerEven;
          if (!txt && !even && !off && !s.firstPage) return undefined;
          const P = (x, isEven) => new Paragraph({ style: 'Header', alignment: isEven && o.mirror ? AlignmentType.START : AlignmentType.END, bidirectional: rtl || undefined, spacing: { after: 0 }, children: x ? [mk(x)] : [] });
          return { default: new Header({ children: [P(txt)] }), ...(evenUsed ? { even: new Header({ children: [P(even ?? txt, true)] }) } : {}), ...(s.firstPage ? { first: new Header({ children: [P('')] }) } : {}) };
        };
        const secs = sections.map((sec) => { const s = sec.opts; return { properties: { ...(s.continuous ? { type: D.SectionType.CONTINUOUS } : s.oddPage ? { type: D.SectionType.ODD_PAGE } : {}), ...(s.firstPage ? { titlePage: true } : {}), ...(s.columns ? { column: { count: s.columns, space: 480 } } : {}), page: { size: { width: pw, height: ph }, margin: { ...mar, header: 600, footer: 600, gutter }, ...(s.numbering || s.start !== undefined ? { pageNumbers: { ...(s.start !== undefined ? { start: s.start } : {}), ...(s.numbering ? { formatType: fmt[s.numbering] } : {}) } } : {}) } }, headers: headerOf(s), footers: footerOf(s), children: flat(sec.kids) }; }).map((x, i) => deep(x, sections[i].opts.docx || {}));
        const clsStyles = Object.entries(classes).map(([n, c]) => { const parent = [].concat(c.composes || []).map((x) => String(x).replace(/^\./, ''))[0]; if (parent && !classes[parent]) throw new Error(`style: composes unknown class .${parent}`); const extra = [].concat(c.composes || []).slice(1).reduce((acc, x) => ({ ...classes[String(x).replace(/^\./, '')], ...acc }), {}); const { run, paragraph } = compile({ ...extra, ...c }); return { id: clsId(n), name: n, basedOn: parent ? clsId(parent) : 'Normal', next: 'Normal', quickFormat: true, run, paragraph }; });
        const sz = (e, d) => el(e, d);
        const bodyE = compile(elements.body || {});
        const h1Base = { run: { font: font(t.head), size: 32, bold: true, color: t.accent }, paragraph: { indent: FLUSH, spacing: { before: hz(360), after: hz(120) }, keepNext: true, keepLines: true, ...(t.rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: t.line, space: 3 } } } : {}) } };
        const { breakBefore: _bb, ...h1Css } = elements.h1 || {};   // the contents title looks like a chapter heading but stays out of the contents and off a forced new page
        const styles = {
          default: {
            document: { run: { font: font(t.body), size: body, color: t.ink, rightToLeft: rtl || undefined, language: rtl ? { value: 'en-US', bidirectional: 'ar-SA' } : undefined, ...bodyE.run }, paragraph: { spacing: { after: hz(120), line: Math.round(276 * (1 + 0.12 * (spread - 1))), ...(bodyE.paragraph.spacing || {}) }, ...(bodyE.paragraph.alignment ? { alignment: bodyE.paragraph.alignment } : {}), ...(bodyE.paragraph.indent ? { indent: bodyE.paragraph.indent } : {}) } },
            title: sz('title', { run: { font: font(t.head), size: 56, bold: true, color: t.ink }, paragraph: { indent: FLUSH, spacing: { before: 0, after: hz(120) }, ...(t.rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: t.accent, space: 6 } } } : {}) } }),
            heading1: sz('h1', h1Base),
            heading2: sz('h2', { run: { font: font(t.head), size: 25, bold: true, color: t.ink }, paragraph: { indent: FLUSH, spacing: { before: hz(240), after: hz(80) }, keepNext: true, keepLines: true } }),
            heading3: sz('h3', { run: { font: font(t.body), size: body + 1, bold: true, color: t.muted }, paragraph: { indent: FLUSH, spacing: { before: hz(180), after: hz(60) }, keepNext: true } }),
            footnoteText: sz('footnote', { run: { size: Math.max(17, body - 3) }, paragraph: { indent: FLUSH, spacing: { after: 40, line: 240 } } }),
          },
          paragraphStyles: [
            { id: 'Subtitle', name: 'Subtitle', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...sz('subtitle', { run: { size: 26, color: t.muted }, paragraph: { indent: FLUSH, spacing: { after: hz(240) } } }) },
            { id: 'Caption', name: 'caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...sz('caption', { run: { size: 18, color: t.muted }, paragraph: { indent: FLUSH, spacing: { before: 60, after: hz(120) } } }) },
            { id: 'Small', name: 'Small', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 18, color: t.muted }, paragraph: { indent: FLUSH, spacing: { after: hz(80) } } },
            { id: 'TableText', name: 'Table Text', basedOn: 'Normal', run: { size: body - 1 }, paragraph: { indent: FLUSH, spacing: { after: 0, line: 252 } } },
            { id: 'Footer', name: 'footer', basedOn: 'Normal', ...sz('footer', { run: { size: 17, color: t.muted }, paragraph: { indent: FLUSH, spacing: { after: 0 }, border: { top: line(t.line, 4) } } }) },
            { id: 'Header', name: 'header', basedOn: 'Normal', ...sz('header', { run: { size: 17, color: t.muted }, paragraph: { indent: FLUSH, spacing: { after: 0 } } }) },
            { id: 'Gap', name: 'Gap', basedOn: 'Normal', run: { size: 8 }, paragraph: { indent: FLUSH, spacing: { after: 0, line: 160 } } },
            { id: 'ContentsTitle', name: 'Contents Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...sz('contentsTitle', merge(h1Base, compile(h1Css))) },
            ...[0, 1, 2].map((l) => ({ id: `TOC${l + 1}`, name: `toc ${l + 1}`, basedOn: 'Normal', next: 'Normal', ...sz(`toc${l + 1}`, { run: l ? {} : { bold: true }, paragraph: { indent: { ...FLUSH, start: l * 280 }, spacing: { before: l ? 0 : 100, after: 40, line: 264 }, alignment: AlignmentType.START, ...(rtl ? { bidirectional: true } : {}) } }) })),
            ...clsStyles,
          ],
        };
        // right-to-left: a plain space after the number collapses against Arabic text, so the number carries its own separator
        const hdLevels = [chapterText, '%1.%2', '%1.%2.%3'].map((text, level) => ({ level, format: LevelFormat.DECIMAL, text: rtl ? `${text} – ` : text, start: level === 0 ? chapterStart : 1, alignment: AlignmentType.START, suffix: rtl ? D.LevelSuffix.NOTHING : D.LevelSuffix.SPACE, style: { paragraph: { indent: { left: 0, hanging: 0 } } } }));
        const footnotes = Object.fromEntries(Object.entries(notes).map(([id, txt]) => [id, { children: [new Paragraph({ style: 'FootnoteText', bidirectional: rtl || undefined, children: runs(txt) })] }]));
        return new Document(deep({ title: o.title, creator: o.author || 'Author', styles, footnotes, ...(o.hyphenate ? { hyphenation: { autoHyphenation: true } } : {}),...(evenUsed ? { evenAndOddHeaderAndFooters: true } : {}), numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START, style: { run: { color: t.accent }, paragraph: { indent: { left: 460, hanging: 280 } } } }] }, { reference: 'hd', levels: hdLevels }, ...numbering] }, sections: secs }, o.docx || {}));
      };
      fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
      let pageOf = null;
      if (usedToc) { measuring = true; const probe = await Packer.toBuffer(pass()); measuring = false; pageOf = await tocPages(probe, heads, headMark); }
      let buf = await Packer.toBuffer(pass(pageOf));
      if (o.mirror) { // the docx package has no option for this one setting; it belongs right after displayBackgroundShape in the schema's order
        const JSZip = require(require.resolve('jszip', { paths: [path.dirname(require.resolve('docx'))] }));   // docx's own dependency, nested under it in a global install
        const zip = await JSZip.loadAsync(buf), part = zip.file('word/settings.xml'), xml = await part.async('string');
        if (!xml.includes('<w:displayBackgroundShape')) throw new Error('mirror: unexpected settings.xml from the docx package');
        zip.file('word/settings.xml', xml.replace(/(<w:displayBackgroundShape[^>]*\/>)/, '$1<w:mirrorMargins/>'));
        buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      }
      fs.writeFileSync(file, buf); console.log('wrote', file); return api;
    },
  };
  return api;
}

// contents page numbers: convert a copy carrying invisible marks once with LibreOffice; each heading's mark says which page it is on,
// and that page's footer mark gives the number exactly as its section shows it (roman, restarted, continued)
async function tocPages(buf, heads, headMark) {
  const exe = process.env.SOFFICE || [process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'LibreOffice', 'program', 'soffice.exe')].find((p) => p && fs.existsSync(p)) || 'soffice';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docxtoc-'));
  try {
    const src = path.join(tmp, 'a.docx'); fs.writeFileSync(src, buf);
    const lo = spawnSync(exe, [`-env:UserInstallation=file:///${tmp.replace(/\\/g, '/')}/lo`, '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmp, src], { timeout: 180000, windowsHide: true });
    const pdf = path.join(tmp, 'a.pdf');
    if (lo.error || !fs.existsSync(pdf)) { console.log('WARN contents: LibreOffice not available, page numbers left for Word to fill'); return null; }
    const txt = spawnSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', timeout: 60000, windowsHide: true, maxBuffer: 1 << 28 });
    if (txt.error || !txt.stdout) { console.log('WARN contents: pdftotext not available, page numbers left for Word to fill'); return null; }
    const pages = txt.stdout.split('\f').map((s) => s.replace(/[\s‎‏]+/g, ''));
    const pageOf = (h) => { const p = pages.find((x) => x.includes(headMark(h))), m = p && p.match(/ZQP(.+?)ZQ/); return m ? m[1] : undefined; };
    const missing = heads.filter((h) => pageOf(h) === undefined);
    if (missing.length) console.log(`WARN contents: no page number found for ${missing.map((h) => `"${h.title}"`).join(', ')}; Word fills them when the field is refreshed`);
    return pageOf;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
module.exports = { doc, THEMES, tex, D };
