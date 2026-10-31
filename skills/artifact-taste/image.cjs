#!/usr/bin/env node
// Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
// SPDX-License-Identifier: LicenseRef-Proprietary
// Draw anything a browser can draw (a local HTML or SVG file) into a PNG, with the shipped fonts loaded
// (Arabic letters always get a shipped Arabic face). It adds no style and no layout: what you drew is what you get.
// Usage: node image.cjs drawing.(html|svg) out/drawing.png [--w 1200] [--h 800] [--scale 2] [--transparent]
//   --h omitted: as tall as the content (--w sets the layout width). --scale 2: twice the pixels, same size on the page. Needs NODE_PATH for playwright.
'use strict';
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');

const FONTS = path.join(__dirname, '..', 'fonts');
const WEIGHTS = { Regular: 400, Medium: 500, Bold: 700 };
const ARABIC_RANGE = 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF';
const q = (s) => '"' + String(s).replace(/["\\]/g, '\\$&') + '"';

function faces() {
  const out = [];
  for (const fam of fs.readdirSync(FONTS)) {
    const dir = path.join(FONTS, fam);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const [style, w] of Object.entries(WEIGHTS)) {
      const f = path.join(dir, `${fam}-${style}.ttf`);
      if (!fs.existsSync(f)) continue;
      const url = q(pathToFileURL(f).href);
      out.push(`@font-face{font-family:${q(fam)};font-weight:${w};src:url(${url})}`);
      if (fam === 'IBMPlexSansArabic') out.push(`@font-face{font-family:"Shipped Arabic";font-weight:${w};src:url(${url});unicode-range:${ARABIC_RANGE}}`);
    }
  }
  return out.join('');
}

async function main() {
  const pos = [], o = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--transparent') o.transparent = true;
    else if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } else pos.push(a[i]);
  }
  if (pos.length !== 2) throw new Error('usage: node image.cjs drawing.(html|svg) out.png [--w 1200] [--h 800] [--scale 2] [--transparent]');
  const [src, out] = pos.map((p) => path.resolve(p));
  if (!fs.existsSync(src)) throw new Error(`no such file: ${src}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const w = +(o.w || 1200), scale = +(o.scale || 2);

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: w, height: +(o.h || 800) }, deviceScaleFactor: scale });
    page.on('pageerror', (e) => console.log(`WARN page error: ${e.message}`));
    if (/\.svg$/i.test(src)) {
      // inline, not <img>, so the page's fonts apply to the drawing's text
      const svg = fs.readFileSync(src, 'utf8').replace(/^\s*<\?xml[^>]*\?>/, '').replace(/<!DOCTYPE[^>]*>/i, '');
      const m = svg.match(/<svg[^>]*>/i);
      const dir = m && /\sdirection\s*[:=]\s*["']?rtl|\sdir\s*=\s*["']rtl/i.test(m[0]) ? ' dir="rtl"' : '';
      await page.setContent(`<!doctype html><meta charset="utf-8"><html${dir}><body style="margin:0"><style>svg{display:block}</style>${svg}</body></html>`);
    } else {
      await page.goto(pathToFileURL(src).href);
    }
    await page.evaluate(async ({ css, transparent }) => {
      const st = document.createElement('style');
      st.textContent = css + 'html,body{margin:0}' + (transparent ? '' : 'html{background:#fff}');
      document.head.prepend(st);
      // Arabic letters never fall to a system font
      for (const el of document.querySelectorAll('body, body *')) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && /[\u0600-\u06FF]/.test(n.textContent))) continue;
        if (!/Arabic|Amiri|Cairo|Tajawal/.test(getComputedStyle(el).fontFamily)) el.style.fontFamily = `"Shipped Arabic",${getComputedStyle(el).fontFamily}`;
      }
      await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
      await document.fonts.ready;
    }, { css: faces(), transparent: !!o.transparent });
    if (!o.h) await page.setViewportSize({ width: w, height: 1 }); // scrollHeight is never below the viewport
    const h = o.h ? +o.h : await page.evaluate(() => Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)));
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: out, omitBackground: !!o.transparent, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`${out}  ${w}x${h} at ${scale}x = ${w * scale}x${h * scale}px${o.transparent ? ', transparent' : ''}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(`ERROR ${e.message}`); process.exit(1); });
