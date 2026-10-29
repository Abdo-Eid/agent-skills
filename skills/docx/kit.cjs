// Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
// SPDX-License-Identifier: LicenseRef-Proprietary
// docx 9.7.1 kit: real Title/Heading styles, tables with header rows and keep-together, callouts,
// lists, tab lines, footer 'Page X of Y', A4/Letter, RTL switch. API in SKILL.md.
const fs = require('fs');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, PageNumber,
  Header, Footer, LevelFormat, TabStopType, HeadingLevel, TableLayoutType, VerticalAlign } = D;

// th: solid | tint | rule (table header look); rule: underline under Title/Heading 1
// Fonts are Arial and Times New Roman only: Word has them everywhere and the image renders them with the
// metric-compatible Liberation faces (Calibri and Cambria are not in the image).
const THEMES = {
  navy:   { accent: '1B3A63', ink: '16202C', muted: '5E6978', tint: 'E8EEF6', line: 'C9D2DE', head: 'Times New Roman', body: 'Arial', th: 'solid', rule: true },
  forest: { accent: '1F6B4A', ink: '18221D', muted: '5F6C65', tint: 'E9F3EE', line: 'CAD8CF', head: 'Arial', body: 'Arial', th: 'tint', rule: false },
  clay:   { accent: 'B4472B', ink: '2A211D', muted: '7A6A62', tint: 'F8ECE5', line: 'E4D3C9', head: 'Times New Roman', body: 'Times New Roman', th: 'rule', rule: true },
  slate:  { accent: '2B2F36', ink: '1B1D21', muted: '6A6F78', tint: 'EEF0F2', line: 'D2D5DA', head: 'Arial', body: 'Arial', th: 'solid', rule: false },
};
const PAGES = { A4: [11906, 16838], Letter: [12240, 15840] };
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const line = (color, size = 4) => ({ style: BorderStyle.SINGLE, size, color });

function doc(o = {}) {
  if (!o.theme && !(o.tokens && o.tokens.accent)) throw new Error(`choose the colours for this document: theme (${Object.keys(THEMES).join(' ')}) or tokens with at least an accent`);
  if (o.theme && !THEMES[o.theme]) throw new Error(`unknown theme ${o.theme}: ${Object.keys(THEMES).join(' ')}, or pass tokens`);
  const t = { ...THEMES.slate, ...(o.theme ? THEMES[o.theme] : {}), ...o.tokens };
  const rtl = !!o.rtl, den = o.density || 1, body = o.size || Math.round(21 * (1 + 0.12 * (den - 1)));       // size in half-points (21 = 10.5pt)
  const [pw, ph] = PAGES[o.page || 'A4'], mar = o.margin || 1247;       // 1247 twips = 2.2 cm
  // spread: spacing-only multiplier (fonts unchanged); check.py --fit sets it through DOCX_SPREAD to fill a fixed page count
  const spread = +(process.env.DOCX_SPREAD || o.spread || 1);
  const W = pw - 2 * mar, hz = (v) => Math.round(v * den * spread);
  const font = (f) => ({ ascii: f, hAnsi: f, eastAsia: f, cs: rtl ? (o.csFont || 'Arial') : f });
  const al = (a) => (a === 'r' ? AlignmentType.END : a === 'c' ? AlignmentType.CENTER : AlignmentType.START);
  const kids = [], numbering = []; let nlist = 0, h1n = 0, lastP = null;

  // inline markup: **bold**, *italic*
  const runs = (text, r = {}) => String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map((s) => {
    const b = s.startsWith('**'), i = !b && s.startsWith('*') && s.length > 2;
    return new TextRun({ text: b ? s.slice(2, -2) : i ? s.slice(1, -1) : s, bold: b || r.bold, italics: i || r.italics, color: r.color, size: r.size, rightToLeft: rtl || undefined });
  });
  const para = (text, p = {}, r = {}) => new Paragraph({ ...p, bidirectional: rtl || undefined, children: Array.isArray(text) ? text : runs(text, r) });

  const styles = {
    default: {
      document: { run: { font: font(t.body), size: body, color: t.ink, rightToLeft: rtl || undefined, language: rtl ? { value: 'en-US', bidirectional: 'ar-SA' } : undefined }, paragraph: { spacing: { after: hz(120), line: Math.round(276 * (1 + 0.12 * (spread - 1))) } } },
      title: { run: { font: font(t.head), size: 56, bold: true, color: t.ink }, paragraph: { spacing: { before: 0, after: hz(120) }, ...(t.rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: t.accent, space: 6 } } } : {}) } },
      heading1: { run: { font: font(t.head), size: 32, bold: true, color: t.accent }, paragraph: { spacing: { before: hz(360), after: hz(120) }, keepNext: true, keepLines: true, ...(t.rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: t.line, space: 3 } } } : {}) } },
      heading2: { run: { font: font(t.head), size: 25, bold: true, color: t.ink }, paragraph: { spacing: { before: hz(240), after: hz(80) }, keepNext: true, keepLines: true } },
      heading3: { run: { font: font(t.body), size: body + 1, bold: true, color: t.muted }, paragraph: { spacing: { before: hz(180), after: hz(60) }, keepNext: true } },
    },
    paragraphStyles: [
      { id: 'Subtitle', name: 'Subtitle', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, color: t.muted }, paragraph: { spacing: { after: hz(240) } } },
      { id: 'Kicker', name: 'Kicker', basedOn: 'Normal', next: 'Normal', run: { size: 17, bold: true, color: t.accent, characterSpacing: rtl ? 0 : 30, allCaps: !rtl }, paragraph: { spacing: { after: hz(80) }, keepNext: true } },
      { id: 'Caption', name: 'caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 17, italics: true, color: t.muted }, paragraph: { spacing: { before: 60, after: hz(200) } } },
      { id: 'TableText', name: 'Table Text', basedOn: 'Normal', run: { size: body - 1 }, paragraph: { spacing: { after: 0, line: 252 } } },
      { id: 'Footer', name: 'footer', basedOn: 'Normal', run: { size: 16, color: t.muted }, paragraph: { spacing: { after: 0 } } },
      { id: 'Header', name: 'header', basedOn: 'Normal', run: { size: 16, color: t.muted }, paragraph: { spacing: { after: 0 } } },
      { id: 'Gap', name: 'Gap', basedOn: 'Normal', run: { size: 8 }, paragraph: { spacing: { after: 0, line: 160 } } },
    ],
  };

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
  const add = (...x) => { kids.push(...x); return api; };
  // a short paragraph right before a table or callout stays on its page (keep-with-next)
  const intro = () => { if (lastP && kids[kids.length - 1] === lastP.node && lastP.text.length <= 300) kids[kids.length - 1] = para(lastP.text, { ...lastP.opts, keepNext: true }); };
  const text = (s, p) => { const node = para(s, p); lastP = { node, text: s, opts: p }; return add(node); };

  const api = {
    t, W, rtl, runs, para, kids,
    add,
    title: (s) => add(para(s, { heading: HeadingLevel.TITLE })),
    subtitle: (s) => add(para(s, { style: 'Subtitle' })),
    kicker: (s) => add(para(s, { style: 'Kicker' })),
    h1: (s, num = true) => add(para(o.numberH1 && num ? `${++h1n}. ${s}` : s, { heading: HeadingLevel.HEADING_1 })),
    h2: (s) => add(para(s, { heading: HeadingLevel.HEADING_2 })),
    h3: (s) => add(para(s, { heading: HeadingLevel.HEADING_3 })),
    p: (s, p = {}) => text(s, p),
    small: (s) => text(s, { style: 'Caption' }),
    pageBreak: () => add(new Paragraph({ pageBreakBefore: true, children: [] })),
    gap: () => add(new Paragraph({ style: 'Gap', children: [] })),
    bullets: (items) => { items.forEach((s) => add(para(s, { numbering: { reference: 'bul', level: 0 }, spacing: { after: hz(60) } }))); return api; },
    numbered: (items) => { const ref = 'num' + ++nlist; numbering.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { run: { bold: true, color: t.accent }, paragraph: { indent: { left: 460, hanging: 340 } } } }] }); items.forEach((s) => add(para(s, { numbering: { reference: ref, level: 0 }, spacing: { after: hz(60) } }))); return api; },
    // left text, right text on one line using a right tab stop at the margin
    tabline: (l, r, p = {}) => add(new Paragraph({ ...p, bidirectional: rtl || undefined, tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [...runs(l), new TextRun({ text: '\t' }), ...runs(r)] })),

    // t.table({head:[..], rows:[[..]], widths:[3,1], align:'lr', total:true, caption:'Table 1...'})
    table({ head, rows, widths, align, total, caption, zebra, keep = true, firstBold = true }) {
      intro();
      const n = head.length, w = split(widths || head.map(() => 1)), a = align || 'l'.repeat(n);
      const all = [head, ...rows], kn = keep && all.length <= 14;
      const hs = { solid: { fill: t.accent, color: 'FFFFFF', bottom: null }, tint: { fill: t.tint, color: t.accent, bottom: line(t.accent, 8) }, rule: { fill: null, color: t.accent, bottom: line(t.accent, 8) } }[t.th];
      const trs = all.map((r, i) => {
        const last = i === all.length - 1, hd = i === 0, tot = total && last;
        const keepNext = kn && (!last || !!caption);
        return row(r.map((x, j) => cell(x, w[j], {
          al: a[j], bold: hd || tot || (firstBold && j === 0), keep: keepNext, color: hd ? hs.color : undefined, size: hd ? body - 3 : undefined,
          fill: hd ? hs.fill : tot ? t.tint : zebra && i % 2 === 0 ? t.tint : undefined, bottom: hd ? hs.bottom : line(t.line, 4), top: tot ? line(t.accent, 8) : undefined, pad: hd ? 100 : 90,
        })), hd);
      });
      add(tbl(trs, w));
      return caption ? add(para(caption, { style: 'Caption' })) : api.gap();
    },
    callout(text, title) {
      intro();
      const ch = [...(title ? [para(title, { style: 'TableText', keepNext: true }, { bold: true, color: t.accent })] : []), para(text, { style: 'TableText', spacing: { before: title ? 40 : 0, after: 0, line: 276 } }, { size: body })];
      const c = new TableCell({ width: { size: W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: t.tint }, margins: { top: hz(160), bottom: hz(160), left: 220, right: 220 },
        borders: { top: NONE, bottom: NONE, start: line(t.accent, 24), end: NONE }, children: ch });
      add(tbl([row([c])], [W])); return api.gap();
    },

    async save(path) {
      const f = (txt) => [new TextRun({ text: txt, size: 16, color: t.muted, rightToLeft: rtl || undefined })];
      const ft = new Paragraph({ style: 'Footer', bidirectional: rtl || undefined, tabStops: [{ type: TabStopType.RIGHT, position: W }], border: { top: line(t.line, 4) }, spacing: { before: 0, after: 0 },
        children: [...f(o.footer || o.title || ''), new TextRun({ text: '\t', size: 16 }),
          ...f(rtl ? 'صفحة ' : 'Page '), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: t.muted }), ...f(rtl ? ' من ' : ' of '), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: t.muted })] });
      const hd = o.header ? { default: new Header({ children: [new Paragraph({ style: 'Header', alignment: AlignmentType.END, bidirectional: rtl || undefined, spacing: { after: 0 }, children: f(o.header) })] }) } : undefined;
      const d = new Document({ title: o.title, creator: o.author || 'Author', styles, numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START, style: { run: { color: t.accent }, paragraph: { indent: { left: 460, hanging: 280 } } } }] }, ...numbering] },
        sections: [{ properties: { page: { size: { width: pw, height: ph }, margin: { top: mar, bottom: mar, left: mar, right: mar, header: 600, footer: 600 } } }, headers: hd, footers: { default: new Footer({ children: [ft] }) }, children: kids }] });
      fs.mkdirSync(require('path').dirname(path), { recursive: true });
      fs.writeFileSync(path, await Packer.toBuffer(d)); console.log('wrote', path); return api;
    },
  };
  return api;
}
module.exports = { doc, THEMES };
