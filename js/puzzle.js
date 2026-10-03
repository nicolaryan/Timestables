/* Collectable jigsaw puzzles. Each puzzle is a generated op-art picture
   cut into 4×4 jigsaw pieces; pieces are won by finishing rounds. */
(function (root) {
  'use strict';

  const N = 4;            // pieces per side
  const S = 100;          // piece size in SVG units
  const PIECES = N * N;
  const PAD = 26;         // room for the knobs on the outside edge

  const PALETTES = [
    ['#2D5BFF', '#FF3D7F', '#FFC700', '#111111'],
    ['#00C29A', '#7B4DFF', '#FF7A00', '#111111'],
    ['#FF3D7F', '#FFC700', '#00C29A', '#2D5BFF'],
    ['#7B4DFF', '#FF7A00', '#2D5BFF', '#111111'],
    ['#111111', '#FF3D7F', '#00C29A', '#FFC700'],
  ];

  const f1 = n => n.toFixed(1);

  // Each design draws a 480×480 picture covering the puzzle and its knobs.
  const DESIGNS = [
    {
      name: 'Ripples',
      draw(p) {
        let s = '';
        for (let r = 660, i = 0; r > 0; r -= 30, i++) {
          s += `<circle cx="140" cy="160" r="${r}" fill="${i % 2 ? '#fff' : p[(i >> 1) % p.length]}"/>`;
        }
        return s;
      },
    },
    {
      name: 'Waves',
      draw(p) {
        let s = '<rect x="-40" y="-40" width="480" height="480" fill="#fff"/>';
        for (let y = -60, i = 0; y < 460; y += 26, i++) {
          const amp = 8 + 10 * Math.sin(y / 90);
          const top = [], bottom = [];
          for (let x = -40; x <= 440; x += 10) {
            const yy = y + amp * Math.sin(x / 38 + y / 60);
            top.push(x + ',' + f1(yy));
            bottom.unshift(x + ',' + f1(yy + 13));
          }
          s += `<polygon points="${top.concat(bottom).join(' ')}" fill="${p[i % p.length]}"/>`;
        }
        return s;
      },
    },
    {
      name: 'Dots',
      draw(p) {
        let s = '<rect x="-40" y="-40" width="480" height="480" fill="#fff"/>';
        for (let y = -32; y < 440; y += 32) {
          for (let x = -32; x < 440; x += 32) {
            const d = Math.hypot(x - 260, y - 200);
            const r = 3 + 11 * (0.5 + 0.5 * Math.cos(d / 45));
            s += `<circle cx="${x}" cy="${y}" r="${f1(r)}" fill="${p[Math.floor(d / 90) % p.length]}"/>`;
          }
        }
        return s;
      },
    },
    {
      name: 'Sunburst',
      draw(p) {
        let s = '<rect x="-40" y="-40" width="480" height="480" fill="#fff"/>';
        const n = 28;
        for (let i = 0; i < n; i += 2) {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
          s += `<polygon points="200,200 ${f1(200 + 600 * Math.cos(a0))},${f1(200 + 600 * Math.sin(a0))} ${f1(200 + 600 * Math.cos(a1))},${f1(200 + 600 * Math.sin(a1))}" fill="${p[(i >> 1) % p.length]}"/>`;
        }
        s += `<circle cx="200" cy="200" r="70" fill="#fff"/><circle cx="200" cy="200" r="44" fill="${p[1]}"/>`;
        return s;
      },
    },
    {
      name: 'Blocks',
      draw(p, rng) {
        let s = '<rect x="-40" y="-40" width="480" height="480" fill="#fff"/>';
        for (let y = -40; y < 440; y += 40) {
          for (let x = -40; x < 440; x += 40) {
            const k = Math.floor(rng() * (p.length + 1));
            if (k < p.length) s += `<rect x="${x + 3}" y="${y + 3}" width="34" height="34" rx="7" fill="${p[k]}"/>`;
          }
        }
        return s;
      },
    },
    {
      name: 'Bulge',
      draw(p) {
        // Checkerboard whose squares swell towards the middle.
        const lines = [];
        const n = 16;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          lines.push(-40 + 480 * (t - 0.09 * Math.sin(2 * Math.PI * t)));
        }
        let s = '';
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const x = lines[i], y = lines[j], w = lines[i + 1] - x, h = lines[j + 1] - y;
            const inside = Math.hypot(x + w / 2 - 200, y + h / 2 - 200) < 150;
            const fill = (i + j) % 2 ? '#fff' : (inside ? p[0] : p[1]);
            s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w + 0.5)}" height="${f1(h + 0.5)}" fill="${fill}"/>`;
          }
        }
        return s;
      },
    },
  ];

  function rngFor(seed) {
    // mulberry32: same puzzle number always gives the same picture and cut.
    let a = (seed * 2654435761) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Which way each inner edge's knob points: +1 = down/right, -1 = up/left.
  function makeTabs(rng) {
    const h = [], v = [];
    for (let r = 0; r < N - 1; r++) { h[r] = []; for (let c = 0; c < N; c++) h[r][c] = rng() < 0.5 ? 1 : -1; }
    for (let r = 0; r < N; r++) { v[r] = []; for (let c = 0; c < N - 1; c++) v[r][c] = rng() < 0.5 ? 1 : -1; }
    return { h, v };
  }

  // One edge from (x0,y0) to (x1,y1). The knob shape is symmetric, so the
  // two pieces sharing an edge trace it in opposite directions and still match.
  function edge(x0, y0, x1, y1, nx, ny, sign) {
    if (!sign) return `L${x1} ${y1}`;
    const P = (t, h) => f1(x0 + (x1 - x0) * t + nx * h * S * sign) + ' ' + f1(y0 + (y1 - y0) * t + ny * h * S * sign);
    return `L${P(0.36, 0)}C${P(0.42, 0.02)} ${P(0.28, 0.22)} ${P(0.5, 0.22)}` +
           `C${P(0.72, 0.22)} ${P(0.58, 0.02)} ${P(0.64, 0)}L${x1} ${y1}`;
  }

  function piecePath(i, tabs) {
    const r = Math.floor(i / N), c = i % N, x = c * S, y = r * S;
    return `M${x} ${y}` +
      edge(x, y, x + S, y, 0, 1, r > 0 ? tabs.h[r - 1][c] : 0) +
      edge(x + S, y, x + S, y + S, 1, 0, c < N - 1 ? tabs.v[r][c] : 0) +
      edge(x + S, y + S, x, y + S, 0, 1, r < N - 1 ? tabs.h[r][c] : 0) +
      edge(x, y + S, x, y, 1, 0, c > 0 ? tabs.v[r][c - 1] : 0) + 'Z';
  }

  let svgCount = 0;

  // SVG markup for puzzle `number` with the `revealed` piece indexes shown.
  // `fresh` pieces get a pop-in animation.
  function render(number, revealed, fresh) {
    const id = 'pz' + (++svgCount);
    const rng = rngFor(number + 1);
    const tabs = makeTabs(rng);
    const design = DESIGNS[number % DESIGNS.length];
    const palette = PALETTES[number % PALETTES.length];
    const shown = new Set(revealed);
    const isNew = new Set(fresh || []);
    let pieces = '', outlines = '';
    for (let i = 0; i < PIECES; i++) {
      const d = piecePath(i, tabs);
      outlines += `<path d="${d}"/>`;
      if (shown.has(i)) {
        pieces += `<g class="piece${isNew.has(i) ? ' new' : ''}"><clipPath id="${id}-c${i}"><path d="${d}"/></clipPath>` +
                  `<use href="#${id}-art" clip-path="url(#${id}-c${i})"/></g>`;
      } else {
        pieces += `<path class="gap" d="${d}"/>`;
      }
    }
    const v = -PAD, size = N * S + PAD * 2;
    return `<svg class="puzzle-svg" viewBox="${v} ${v} ${size} ${size}" role="img" aria-label="${design.name} puzzle, ${shown.size} of ${PIECES} pieces">` +
      `<defs><g id="${id}-art">${design.draw(palette, rng)}</g></defs>` +
      pieces + `<g class="outlines">${outlines}</g></svg>`;
  }

  // Add won pieces to a player's puzzle state, starting a new puzzle
  // whenever one is finished. Returns what changed, for the results screen.
  function addPieces(state, count) {
    const completed = [];
    let fresh = [];
    for (let k = 0; k < count; k++) {
      const missing = [];
      for (let i = 0; i < PIECES; i++) if (state.pieces.indexOf(i) < 0) missing.push(i);
      const piece = missing[Math.floor(Math.random() * missing.length)];
      state.pieces.push(piece);
      fresh.push(piece);
      if (state.pieces.length === PIECES) {
        completed.push(state.number);
        state.completed.push(state.number);
        state.number++;
        state.pieces = [];
        fresh = [];
      }
    }
    return { completed, fresh };
  }

  function name(number) { return DESIGNS[number % DESIGNS.length].name; }

  root.Puzzle = { PIECES, render, addPieces, name, piecePath, makeTabs, rngFor };
})(this);
