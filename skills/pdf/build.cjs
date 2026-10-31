#!/usr/bin/env node
// Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
// SPDX-License-Identifier: LicenseRef-Proprietary
// Print your own HTML file to PDF with Chromium, adding only what HTML cannot do for print by itself:
// shipped fonts, @page size and margins, the footer with "Page N of M", language and direction, and Arabic
// letters always in a shipped Arabic face. Your CSS loads after all of this, so it always wins.
// Usage: node build.cjs doc.html out/doc.pdf [--footer "text"] [--size A4|Letter] [--margin 20] [--digits arabic-indic]
'use strict';
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');

const FONTS = path.join(__dirname, '..', 'fonts');
const ICON_FILE = path.join(__dirname, '..', 'icons', 'icons.json');
const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'ku', 'sd', 'yi', 'dv'];
const LABELS = { ar: ['صفحة', 'من'], he: ['עמוד', 'מתוך'], fa: ['صفحه', 'از'], ur: ['صفحہ', 'از'], en: ['Page', 'of'] };
const SIZES = { A4: [210, 297], Letter: [215.9, 279.4] };
const WEIGHTS = { Regular: 400, Medium: 500, Bold: 700 };
const MM = 96 / 25.4, MT = 24, MB = 24;
const ARABIC_RANGE = 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF';
const ALIAS = 'Shipped Arabic'; // Arabic letters only; Latin letters fall through to the author's font
const css = (s) => '"' + String(s).replace(/["\\]/g, '\\$&').replace(/\n/g, ' ') + '"';

function faces() {
  const out = [];
  for (const fam of fs.readdirSync(FONTS)) {
    const dir = path.join(FONTS, fam);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const [style, w] of Object.entries(WEIGHTS)) {
      const f = path.join(dir, `${fam}-${style}.ttf`);
      if (!fs.existsSync(f)) continue;
      const url = css(pathToFileURL(f).href);
      out.push(`@font-face{font-family:${css(fam)};font-weight:${w};src:url(${url})}`);
      if (fam === 'IBMPlexSansArabic') out.push(`@font-face{font-family:${css(ALIAS)};font-weight:${w};src:url(${url});unicode-range:${ARABIC_RANGE}}`);
    }
  }
  return out.join('');
}

/** The first of these that reads on the paper colour, so the footer holds on tinted and dark documents. */
function footerInk(paper) {
  const lum = (c) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const bg = lum(paper ? paper.match(/[\d.]+/g).map(Number) : [255, 255, 255]);
  const reads = (h) => { const [a, b] = [lum(hex(h)), bg].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05) >= 4.5; };
  return ['#6B6B70', '#B4B4B8', '#1F1F22'].find(reads) || '#FFFFFF';
}

/** Everything the page needs before the author's CSS: low precedence by position, first in <head>. */
function kitCss({ lang, rtl, size, margin, footer, digits, title, paper }) {
  const [W, H] = SIZES[size], st = rtl ? 'right' : 'left', en = rtl ? 'left' : 'right';
  const [lp, lo] = LABELS[lang] || LABELS[String(lang).split('-')[0]] || LABELS.en;
  const fmt = digits ? `, ${digits}` : '';
  const face = rtl && lang !== 'he' ? 'IBMPlexSansArabic' : 'Rubik';
  const ink = footerInk(paper);
  const common = `font-family:${css(ALIAS)},${css(face)},sans-serif;font-size:8.5pt;color:${ink};direction:${rtl ? 'rtl' : 'ltr'};`;
  const box = (name, decl) => `@${name}{${common}${decl}}`;
  const hairline = `border-top:.5pt solid ${ink}4D;vertical-align:top;padding-top:3.5mm;`;
  return `${faces()}
@page{size:${W}mm ${H}mm;margin:${MT}mm ${margin}mm ${MB}mm;${paper ? `background:${paper};` : ''}
${box(`bottom-${st}`, `content:${css(footer || title)};text-align:${st};white-space:nowrap;${hairline}`)}
${box('bottom-center', `content:"";${hairline}`)}
${box(`bottom-${en}`, `content:${css(lp + ' ')} counter(page${fmt}) ${css(' ' + lo + ' ')} counter(pages${fmt});text-align:${en};${hairline}`)}}
:root{--page-w:${W}mm;--page-h:${H}mm;--content-w:${W - 2 * margin}mm;--content-h:${H - MT - MB}mm}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact;font-synthesis:none}
body{margin:0;font-family:${css(face)},sans-serif}
thead{display:table-header-group}tr{break-inside:avoid}
h1,h2,h3,h4{break-after:avoid}p,li{orphans:2;widows:2}
[data-icon]{display:inline-block;width:1.15em;height:1.15em;vertical-align:-.2em}`;
}

function args(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { o[argv[i].slice(2)] = argv[i + 1]; i++; } else pos.push(argv[i]);
  }
  return { pos, o };
}

async function main() {
  const { pos, o } = args(process.argv.slice(2));
  if (pos.length !== 2) throw new Error('usage: node build.cjs doc.html out/doc.pdf [--footer "text"] [--size A4|Letter] [--margin 20] [--digits arabic-indic]');
  const [src, file] = pos.map((p) => path.resolve(p));
  if (!fs.existsSync(src)) throw new Error(`no such file: ${src}`);
  const size = o.size || 'A4', margin = +(o.margin || 20);
  if (!SIZES[size]) throw new Error('--size must be A4 or Letter');
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const warn = (m) => console.log(`WARN ${m}`);
  try {
    const [W] = SIZES[size];
    const page = await browser.newPage({ viewport: { width: Math.round((W - 2 * margin) * MM), height: 1400 } });
    const blocked = [];
    await page.route('**/*', (r) => {
      const u = r.request().url();
      if (u.startsWith('file:') || u.startsWith('data:')) return r.continue();
      blocked.push(u); return r.abort();
    });
    await page.emulateMedia({ media: 'print' });
    await page.goto(pathToFileURL(src).href);
    blocked.forEach((u) => warn(`remote file not loaded, use a local file: ${u}`));

    // language and direction: from the file; a mostly Arabic file with neither is set to Arabic
    const meta = await page.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      const ar = (t.match(/[\u0600-\u06FF]/g) || []).length, la = (t.match(/[A-Za-z]/g) || []).length;
      return { lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title, mostlyArabic: ar > la };
    });
    let lang = meta.lang;
    if (!lang) { lang = meta.mostlyArabic ? 'ar' : 'en'; if (meta.mostlyArabic) warn('no lang on <html>: treated as Arabic; write <html lang="ar" dir="rtl">'); }
    const rtl = meta.dir ? meta.dir === 'rtl' : RTL.includes(String(lang).split('-')[0]);
    const title = meta.title || path.basename(src, path.extname(src));
    if (!meta.title) warn('no <title> in the file: the PDF title is the file name');

    const icons = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-icon]')].map((e) => e.dataset.icon))]);
    const ICONS = icons.length ? JSON.parse(fs.readFileSync(ICON_FILE, 'utf8')) : {};
    for (const n of icons) if (!ICONS[n]) throw new Error(`unknown icon "${n}": ${Object.keys(ICONS).join(' ')}`);

    // the page background covers the margins too, so a tinted or dark document has no white frame
    const paper = await page.evaluate(() => {
      for (const e of [document.body, document.documentElement]) {
        const b = getComputedStyle(e).backgroundColor;
        if (b && !/^rgba\(.*, 0\)$|^transparent$/.test(b)) return b;
      }
      return '';
    });

    const shipped = fs.readdirSync(FONTS).filter((f) => fs.statSync(path.join(FONTS, f)).isDirectory());
    const report = await page.evaluate(({ kit, lang, rtl, icons, ALIAS, shipped }) => {
      document.documentElement.lang = lang; document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      const st = document.createElement('style'); st.textContent = kit; document.head.prepend(st);
      document.querySelectorAll('[data-icon]').forEach((e) => {
        e.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[e.dataset.icon]}</svg>`;
      });
      // Arabic letters: never a system font, never letter-spaced. Latin letters keep the author's font.
      const arabicFaces = new Set(shipped.filter((f) => f !== 'InstrumentSerif'));
      let spaced = 0;
      for (const el of document.querySelectorAll('body, body *')) {
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && /[\u0600-\u06FF]/.test(n.textContent));
        if (!own) continue;
        const cs = getComputedStyle(el);
        const list = cs.fontFamily.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
        if (!list.some((f) => arabicFaces.has(f))) el.style.fontFamily = `"${ALIAS}",${cs.fontFamily}`;
        if (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) !== 0) { el.style.letterSpacing = 'normal'; spaced++; }
      }
      return { spaced };
    }, { kit: kitCss({ lang, rtl, size, margin, footer: o.footer, digits: o.digits, title, paper }), lang, rtl, icons: ICONS, ALIAS, shipped });
    if (report.spaced) warn(`letter-spacing removed from ${report.spaced} Arabic text runs (it breaks letter joining)`);
    // Chromium loads a font only when page content uses it, and margin boxes do not count: load every face, or a footer
    // in a font the body does not use prints blank or in Times. Only the glyphs actually printed reach the PDF.
    await page.evaluate(async () => {
      await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
      await document.fonts.ready;
    });

    // the footer stays on one line, so text too long for the room beside the page number would run into it
    const footerText = o.footer || title;
    const footerMm = await page.evaluate(({ text, face, MM }) => {
      const g = document.createElement('canvas').getContext('2d'); g.font = `8.5pt "${face}", sans-serif`;
      return g.measureText(text).width / MM;
    }, { text: footerText, face: rtl && lang !== 'he' ? 'IBMPlexSansArabic' : 'Rubik', MM });
    const footerRoom = W - 2 * margin - 25; // 25mm for "Page 10 of 12" and a gap
    if (footerMm > footerRoom) warn(`footer text is ${Math.round(footerMm)}mm wide and only ${Math.round(footerRoom)}mm fit beside the page number: shorten it to about ${Math.floor(footerText.length * footerRoom / footerMm)} characters`);

    // what a browser can measure about the laid-out page
    const m = await page.evaluate((paper) => {
      const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const base = paper ? rgb(paper) : [255, 255, 255];
      const behind = (el) => { for (let e = el; e; e = e.parentElement) { const v = rgb(getComputedStyle(e).backgroundColor); if (v.length >= 3 && (v[3] === undefined || v[3] > 0.5)) return v; } return base; };
      const tiny = [], faint = [], wide = [], clipped = [];
      const limit = document.documentElement.clientWidth;
      const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '');
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('svg') || ['STYLE', 'SCRIPT', 'TITLE', 'HEAD'].includes(el.tagName)) continue;
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (r.width && (r.right > limit + 1 || r.left < -1) && cs.position !== 'fixed') wide.push(name(el));
        if (cs.overflow !== 'visible' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) clipped.push(name(el));
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!own) continue;
        const pt = Math.round(parseFloat(cs.fontSize) * 75) / 100, txt = el.textContent.trim().slice(0, 30); // rounded: 8.5pt reads back as 8.4999
        if (pt < 8.5) tiny.push(`"${txt}" ${pt.toFixed(1)}pt`);
        else if (pt < 14 && ratio(rgb(cs.color), behind(el)) < 4.5) faint.push(`"${txt}" ${ratio(rgb(cs.color), behind(el)).toFixed(1)}:1`);
      }
      return { tiny, faint, wide: [...new Set(wide)], clipped: [...new Set(clipped)] };
    }, paper);
    if (m.wide.length) warn(`wider than the page, Chromium shrinks the whole page to fit: ${m.wide.slice(0, 5).join(', ')}. For a full-bleed page use a named @page with margin 0`);
    if (m.clipped.length) warn(`content clipped by overflow: ${m.clipped.slice(0, 5).join(', ')}`);
    if (m.tiny.length) warn(`${m.tiny.length} text runs under 8.5pt, e.g. ${m.tiny.slice(0, 3).join(', ')}`);
    if (m.faint.length) warn(`${m.faint.length} small text runs under 4.5:1 contrast, e.g. ${m.faint.slice(0, 3).join(', ')}`);

    // how the source fits the page: each run between forced page breaks, and where it is empty
    const fit = await page.evaluate(({ H, MM, ruleMargins }) => {
      const cs = (e) => getComputedStyle(e), mm = (px) => px / MM;
      const forced = (v) => /^(page|left|right|recto|verso|always)$/.test(v);
      const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '');
      const flows = (e) => e.getBoundingClientRect().height > 0 && !['absolute', 'fixed'].includes(cs(e).position);
      const starts = (el, prev) => prev && (forced(cs(el).breakBefore) || forced(cs(prev).breakAfter) || cs(el).page !== cs(prev).page);
      const flatten = (el) => {
        const kids = [...el.children].filter(flows);
        return kids.some((k, i) => starts(k, kids[i - 1]) || forced(cs(k).breakAfter)) ? kids.flatMap(flatten) : [el];
      };
      // page margins as the author left them: their @page rules win over the build's
      const box = document.createElement('div'); document.body.append(box);
      const len = (v) => { box.style.height = v; return mm(box.getBoundingClientRect().height); };
      const margins = {};
      for (const sheet of document.styleSheets) for (const r of sheet.cssRules) {
        if (!(r instanceof CSSPageRule) || /:/.test(r.selectorText)) continue;
        const n = r.selectorText.trim() || 'auto', t = r.style.marginTop, b = r.style.marginBottom;
        if (t || b) margins[n] = [t ? len(t) : (margins.auto || ruleMargins)[0], b ? len(b) : (margins.auto || ruleMargins)[1]];
      }
      box.remove();
      const usable = (el) => { const [t, b] = margins[cs(el).page] || margins.auto || ruleMargins; return H - t - b; };

      const blocks = flatten(document.body), groups = [];
      blocks.forEach((b, i) => { if (!i || starts(b, blocks[i - 1])) groups.push([b]); else groups[groups.length - 1].push(b); });

      // what is on the page: text, images, drawings, and bars or dots drawn as empty elements with a background (not rules or spines)
      const inks = (roots) => {
        const out = [];
        for (const root of roots) {
          const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (!n.textContent.trim() || ['STYLE', 'SCRIPT'].includes(n.parentElement.tagName)) continue;
            const rg = document.createRange(); rg.selectNodeContents(n);
            for (const r of rg.getClientRects()) if (r.height) out.push([r.top, r.bottom]);
          }
          for (const e of [root, ...root.querySelectorAll('*')]) {
            const r = e.getBoundingClientRect();
            if (!r.height || e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
            const leaf = !e.children.length && !e.textContent.trim() && !/rgba\(.*, 0\)$|transparent/.test(cs(e).backgroundColor);
            if (['IMG', 'SVG', 'CANVAS'].includes(e.tagName.toUpperCase()) || (leaf && mm(r.width) >= 2.5 && mm(r.height) >= 1)) out.push([r.top, r.bottom]);
          }
        }
        return out.sort((a, b) => a[0] - b[0]);
      };
      const gap = (spans, top, bottom) => {
        let best = 0, at = top;
        for (const [s, e] of spans) { if (s - at > best) best = s - at; at = Math.max(at, e); }
        return mm(Math.max(best, bottom - at));
      };
      const hasBox = (e) => { const c = cs(e); return !/rgba\(.*, 0\)$|transparent/.test(c.backgroundColor) || parseFloat(c.borderTopWidth) > 0 && parseFloat(c.borderBottomWidth) > 0; };

      return groups.map((g, i) => {
        // a first child's top margin collapses through its parents and also takes up page height
        let lead = 0;
        for (let e = g[0]; e; e = e.firstElementChild) {
          const c = cs(e); lead = Math.max(lead, parseFloat(c.marginTop));
          if (parseFloat(c.paddingTop) || parseFloat(c.borderTopWidth) || /flex|grid/.test(c.display)) break;
        }
        const top = g[0].getBoundingClientRect().top - lead;
        const bottom = Math.max(...g.map((b) => b.getBoundingClientRect().bottom)), h = mm(bottom - top), U = usable(g[0]);
        const out = { n: i + 1, name: name(g[0]), h: Math.round(h), U: Math.round(U) };
        const tail = h % U; // what lands on the section's last page
        if (h > U + 0.3 && tail < U * 0.25) {
          out.spill = Math.max(1, Math.round(tail));
          const cut = top + (h - tail) * MM;
          for (const el of g.flatMap((b) => [b, ...b.querySelectorAll('*')])) {
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (own && el.getBoundingClientRect().bottom > cut) { out.at = el.textContent.trim().slice(0, 40); break; }
          }
        }
        if (h <= U + 0.3) {
          const spans = inks(g), end = top + U * MM, empty = gap(spans, top, end);
          if (empty >= U * 0.25) out.empty = Math.round(empty);
          for (const b of g.flatMap((x) => [x, ...x.querySelectorAll('*')])) {
            const r = b.getBoundingClientRect(), bh = mm(r.height);
            if (bh < 40 || bh > U * 0.9 || !hasBox(b) || !b.textContent.trim()) continue;
            const inside = gap(inks([b]), r.top, r.bottom);
            if (inside >= bh * 0.35) { out.hollow = `${name(b)} ${Math.round(bh)}mm tall, ${Math.round(inside)}mm of it empty`; break; }
          }
        }
        return out;
      });
    }, { H: SIZES[size][1], MM, ruleMargins: [MT, MB] });
    console.log(`fit: ${fit.map((f) => `${f.n} ${f.name} ${f.h}/${f.U}mm`).join(' · ')}`);
    for (const f of fit) {
      if (f.spill) warn(`section ${f.n} (${f.name}) is ${f.h}mm on a ${f.U}mm page: about ${f.spill}mm spills onto a page of its own${f.at ? `, from "${f.at}"` : ' (a blank page if nothing is left to print)'}. Take that much out`);
      if (f.empty) warn(`section ${f.n} (${f.name}) has an empty stretch of ${f.empty}mm. Fine if that quiet is deliberate; otherwise give the content more size or real material, or move it to fewer pages. Do not stretch boxes to cover it`);
      if (f.hollow) warn(`section ${f.n}: hollow box, ${f.hollow}. A box should be as tall as what it holds`);
    }

    await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
    const count = () => (fs.readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    let pages = count();
    if (pages === 1) { // no "Page 1 of 1" on a single sheet; the author's own @page rules still come later and win
      await page.evaluate((en) => { const s = document.createElement('style'); s.textContent = `@page{@bottom-${en}{content:""}}`; document.head.children[0].after(s); }, rtl ? 'left' : 'right');
      await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
      pages = count();
    }
    console.log(`built ${file}: ${pages} pages, ${lang}${rtl ? ' rtl' : ''}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
