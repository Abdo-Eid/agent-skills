---
name: pptx
description: Create editable PowerPoint presentations with PptxGenJS and a small kit that handles the mechanics while you own the narrative and composition, and continue generated decks by patching their generator source.
license: Proprietary; see the repository-root LICENSE.
---

# PPTX

Read `<skills-root>/artifact-taste/SKILL.md`, then `<skills-root>/artifact-taste/pptx.md`, first: decide what this deck should be before you open the kit.

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
const d = deck({ style: { /* your stylesheet, see artifact-taste "Styling" */ }, rtl: false, title: '...', footer: 'on every slide' });
let s = d.slide({ /* cover, dark, bg, note, num */ });
// compose the slide: split the page into boxes, place text and regions in them with your classes
d.save('<project-root>/out/deck.pptx'); // last line; prints slide count
```

**Style.** `style` is CSS as an object (see artifact-taste). Variables `--accent --ink --bg --muted --surface --rule --accent2 --deep` set the slide colours, and `--accent` is required (or a `palette`: `coral forest ocean plum ink dune midnight graphite`, as a starting set). Elements: `body` (all text), `th`, `td` (tables), `chart` (chart labels). Properties a slide can do: `fontFamily fontSize fontWeight fontStyle color lineHeight letterSpacing textTransform textAlign verticalAlign background padding border borderTop borderBottom borderInlineStart borderInlineEnd borderRadius opacity`, plus `pptx: {…}` for raw PptxGenJS options. Anything else stops the build and says what to do instead. Any font name works, and the first on a `fontFamily` list is the one used; see artifact-taste on choosing one. Right-to-left text starts in the Noto Arabic faces until you name another that carries Arabic.

`d.slide(opts)` makes a slide: `cover` (no footer or number), `dark` (the deep colours), `bg`, `note` (footer text for this slide), `num`. The footer line and slide number are added on non-cover slides. Colours named for the theme (`accent`, `ink`, `var(--accent)` and so on) follow the slide, so a class stays readable on a dark slide: there `ink` is light and the accent is lightened until it reads, or set `--accentDk` yourself. A `#RRGGBB` value stays fixed.

There is no ready-made cover, slide header, row of big numbers, step row or card grid. You compose every slide from boxes and primitives, so each deck takes the shape its subject needs.

**Layout** (boxes are `{x, y, w, h}` in inches on the 13.333 x 7.5 grid; write them left-to-right, drawing mirrors for right-to-left):

| call | returns |
| --- | --- |
| `d.page()` | the usable area: margin `d.T.M` = 0.7 all round, bottom above the footer |
| `d.split(box, at, dir, gap)` | two boxes: `at` a share (0..1) or inches (> 1); `dir` `'h'` side by side, `'v'` stacked |
| `d.grid(box, cols, rows, gap)` | cell boxes row by row; `cols` a count or relative widths `[2, 1, 1]` |
| `d.stack(s, box, [[str, cls], …], gap)` | places text items top to bottom, each as tall as its class needs; returns the space left below |

**Primitives** (each takes a box and fills it; `cls` is a class name or array, inline CSS goes in the box object):

| call | what it draws |
| --- | --- |
| `d.text(s, str, cls, {x,y,w,h, ...inline})` | text in your class |
| `d.box(s, cls, {x,y,w,h})` | a region: background, border, radius, per-side borders from the class; returns the inside box after `padding` |
| `d.stat(s,{x,y,w,h,value,label,cls,labelCls})` | one big number (shrunk to stay on one line) with its label |
| `d.rect(s,{x,y,w,h,fill,line,lw,shape,alpha})`, `d.rule(s, x, y, w, color, pt)`, `d.panel(s,{x,y,w,h,fill,bar:'top'\|'left'})` | shapes, lines, a filled region (returns its padded inside) |
| `d.line(s,{x1,y1,x2,y2,color,width,arrow,dash})`, `d.circle(s,{cx,cy,r,fill,line,lw,alpha})` | a line at any angle (`arrow`: `true`, `'both'`, `'start'`) and a circle, for drawing what the subject is; a label on a filled shape takes `on: '#colour'` in its box so the contrast check reads the right ground |
| `d.table(s,{x,y,w,h,cols:[3,4,4],head:[],rows:[[]],align?:['left','right','right']})` | native table, rows share the height; `align` per column; a cell may be `{text, color, bold}` |
| `d.bars(s,{x,y,w,h,labels,values\|series:[{name,values}],dir:'bar'\|'col',fmt,hi?})` | native chart with value labels; `fmt` `'$#,##0'`, `'0%'` (fractions), `'0.0'`; `hi` highlights one, and a value tiny beside the largest draws as a sliver with little colour to see; negative values draw below zero in `dir:'col'`; in `'bar'` a negative value's label lands on its category name |
| `d.timeline(s, [{date,label,detail?,at?}], {x,y,w,h,dir:'h'\|'v',span?})` | markers; `at` 0..1 places them in proportion; two items draw a span with `span` text inside |

Anything else: `s.addChart`, `s.addImage`, `s.addShape` directly, with `d.X(x, w)` for x so right-to-left mirrors.

## Rules

- Titles 28 pt or more, body 14 pt or more, labels 12 pt or more. No clipped or overlapping text; avoid `fit: 'shrink'`.
- Native charts and tables, not pictures of them; images keep their aspect ratio.
- Two dates only: never invent middle steps. Risk matrices: marker positions from named likelihood and impact maps; axis labels outside the grid.

## Arabic and right-to-left

A negative number shows its minus at the far end (`54,000-`); start it with `‎` to keep `-54,000`. `deck({rtl: true})`: write coordinates left-to-right; the kit mirrors layout, tables and charts, so never reverse data yourself. Text uses the Noto Naskh/Sans Arabic faces; `textAlign: start` is the right side. Use `d.text` (raw `s.addText` needs `rtlMode: true` and `lang: 'ar-SA'`). Keep the digit style consistent.
