---
name: pptx
description: Create editable PowerPoint presentations with PptxGenJS and a small kit that handles the mechanics while you own the narrative and composition, and continue generated decks by patching their generator source.
license: Proprietary; see the repository-root LICENSE.
---

# PPTX

Read `<skills-root>/artifact-taste/SKILL.md` first: decide what this deck should be before you open the kit.

Write one generator `<project-root>/src/build.cjs` on `require('<skills-root>/pptx/kit.cjs')` (PptxGenJS 4.0.1 underneath; `d.pptx` is the raw instance). Run it with `NODE_PATH` set; it writes `<project-root>/out/deck.pptx` (16:9 unless the user supplies a template or another ratio). Continuation: patch the existing generator, keep its tokens, slide order and assets, rebuild. Editing uploaded PPTX internals is out of scope.

## Workflow

1. Plan the story first: audience, the one-line argument, what each slide must do. Then decide each slide's form from its content, as `artifact-taste` describes. Write the decision as the first comment of the generator. Eight or more slides need a way to navigate (an agenda, a running section marker, a map of the argument).
2. Write the generator and run it; the printed slide count must match the plan.
3. Look: `python <skills-root>/artifact-taste/preview.py <project-root>/out/deck.pptx`, open the slide images, fix and rebuild.
4. Facts: use only supplied facts. Mark derived numbers as derived, proposals as `Proposed`, and put required labels (for example "Fictional") in `deck({footer})`.

## Kit

```js
// Direction: <subject material, chosen structure, why>
const { deck } = require('<skills-root>/pptx/kit.cjs');
const d = deck({ palette: '<chosen>' /* or your own object */, fonts: '<chosen>', rtl: false, title: '...', footer: 'on every slide' });
let s = d.slide({ /* cover, dark, bg, note, num */ });
// compose the slide: split the page into boxes, place primitives in them (or s.addText / s.addShape / s.addChart / s.addImage)
d.save('<project-root>/out/deck.pptx'); // last line; prints slide count
```

**Colours are required**: `palette` `coral forest ocean plum ink dune midnight graphite` (the last two are dark) or your own object `bg surface ink muted accent accent2 rule deep` (optional `accentText`, `accentDk`). Choose from the subject; there is no default. Fonts: `editorial grotesk condensed technical` or `{head, body, mono, stat, headBold}`; only Arial, Arial Narrow, Times New Roman and Courier New are safe in every renderer (and the Noto Arabic faces for Arabic). Colours for hand drawing: `s.c` (`ink muted accent accentText accent2 surface rule bg onAccent deep`).

`d.slide(opts)` makes a slide: `cover` (no footer or number), `dark` (the palette's deep colours), `bg`, `note` (footer text for this slide), `num`. The footer line and slide number are added on non-cover slides.

There is no ready-made cover, slide header, row of big numbers, step row or card grid. You compose every slide from boxes and primitives, so each deck takes the shape its subject needs.

**Layout** (boxes are `{x, y, w, h}` in inches on the 13.333 x 7.5 grid; write them left-to-right, drawing mirrors for right-to-left):

| call | returns |
| --- | --- |
| `d.page()` | the usable area: margin `d.T.M` = 0.7 all round, bottom above the footer |
| `d.split(box, at, dir, gap)` | two boxes: `at` a share (0..1) or inches (> 1); `dir` `'h'` side by side, `'v'` stacked |
| `d.grid(box, cols, rows, gap)` | cell boxes row by row; `cols` a count or relative widths `[2, 1, 1]` |
| `d.inset(box, pad)` | the box shrunk by `pad` on every side |

**Primitives** (each takes a box and fills it):

| call | what it draws |
| --- | --- |
| `d.text(s, str, {x,y,w,h,font:'head'\|'body'\|'stat'\|'mono',fontSize,color,bold,align:'start'\|'end'\|'center',valign,...})` | any text at any size; extra keys go to PptxGenJS (`charSpacing`, `italic`, `lineSpacingMultiple`…) |
| `d.stat(s,{x,y,w,h,value,label,size,color})` | one big number with its label, shrunk to stay on one line |
| `d.rect(s,{x,y,w,h,fill,line,lw,shape,alpha})`, `d.rule(s, x, y, w, color, pt)`, `d.panel(s,{x,y,w,h,fill,bar:'top'\|'left'})` | shapes, lines, a filled region (returns its padded inside) |
| `d.table(s,{x,y,w,h,cols:[3,4,4],head:[],rows:[[]]})` | native table, rows share the height |
| `d.bars(s,{x,y,w,h,labels,values\|series:[{name,values}],dir:'bar'\|'col',fmt,hi?})` | native chart with value labels; `fmt` `'$#,##0'`, `'0%'` (fractions), `'0.0'`; `hi` highlights one |
| `d.timeline(s, [{date,label,detail?,at?}], {x,y,w,h,dir:'h'\|'v',span?})` | markers; `at` 0..1 places them in proportion; two items draw a span with `span` text inside |

Anything else: `s.addChart`, `s.addImage`, `s.addShape` directly, with `d.X(x, w)` for x so right-to-left mirrors.

## Rules

- Titles 28 pt or more, body 14 pt or more, labels 11 pt or more. No clipped or overlapping text; avoid `fit: 'shrink'`.
- Native charts and tables, not pictures of them; images keep their aspect ratio.
- Two dates only: never invent middle steps. Risk matrices: marker positions from named likelihood and impact maps; axis labels outside the grid.
- Reconcile numbers, dates and labels against the brief; drop invented dates and causal claims.

## Arabic and right-to-left

`deck({rtl: true})`: write coordinates left-to-right; the kit mirrors layout, tables and charts, so never reverse data yourself. Fonts are Noto Naskh/Sans Arabic unless you pass `fonts: {head, body}`; use `d.text` (raw `s.addText` needs `rtlMode: true` and `lang: 'ar-SA'`). Keep the digit style consistent.
