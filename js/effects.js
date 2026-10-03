/* Celebration effects drawn on one full-screen canvas:
   shape bursts, confetti, op-art ripples, a Riley-style dot wave,
   spinning swirls and bouncing puzzle blocks. */
(function (root) {
  'use strict';

  const COLORS = ['#FF3D7F', '#2D5BFF', '#FFC700', '#00C29A', '#7B4DFF', '#FF7A00'];
  const SHAPES = ['circle', 'square', 'triangle', 'half', 'ring', 'bar'];
  const TAU = Math.PI * 2;

  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [];
  let W = 0, H = 0, running = false, last = 0;

  function resize() {
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    W = root.innerWidth;
    H = root.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  root.addEventListener('resize', resize);

  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function add(item) {
    items.push(item);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < items.length; i++) {
      if (!items[i](dt)) { items.splice(i, 1); i--; }
    }
    if (items.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  function drawShape(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = ctx.strokeStyle = p.color;
    const s = p.size;
    ctx.beginPath();
    switch (p.shape) {
      case 'circle': ctx.arc(0, 0, s / 2, 0, TAU); ctx.fill(); break;
      case 'square': ctx.rect(-s / 2, -s / 2, s, s); ctx.fill(); break;
      case 'triangle':
        ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2);
        ctx.closePath(); ctx.fill(); break;
      case 'half': ctx.arc(0, 0, s / 2, 0, Math.PI); ctx.closePath(); ctx.fill(); break;
      case 'ring': ctx.lineWidth = s / 5; ctx.arc(0, 0, s / 2.5, 0, TAU); ctx.stroke(); break;
      default: ctx.rect(-s / 2, -s / 6, s, s / 3); ctx.fill();
    }
    ctx.restore();
  }

  // A group of shapes thrown from (x, y) in a direction with some spread.
  function shapes(x, y, opts) {
    const o = Object.assign({ count: 24, speed: 480, angle: -Math.PI / 2, spread: TAU, size: [8, 18], life: 1.4, gravity: 900 }, opts);
    const ps = [];
    for (let i = 0; i < o.count; i++) {
      const a = o.angle + rnd(-o.spread / 2, o.spread / 2);
      const v = o.speed * rnd(0.35, 1);
      ps.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        rot: rnd(0, TAU), vr: rnd(-8, 8), size: rnd(o.size[0], o.size[1]),
        color: pick(COLORS), shape: pick(SHAPES), alpha: 1, life: o.life * rnd(0.7, 1.1),
      });
    }
    let t = 0;
    add(dt => {
      t += dt;
      let alive = false;
      for (const p of ps) {
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + o.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.alpha = 1 - Math.pow(t / p.life, 3);
        if (p.alpha > 0 && p.y < H + 40) { alive = true; drawShape(p); }
      }
      return alive;
    });
  }

  // Concentric rings racing outwards, alternating colour and black.
  function ripples(x, y) {
    const rings = 8, gap = 0.09, life = 1.1;
    const maxR = Math.hypot(W, H);
    let t = 0;
    add(dt => {
      t += dt;
      for (let k = 0; k < rings; k++) {
        const tk = t - k * gap;
        if (tk <= 0 || tk > life) continue;
        ctx.globalAlpha = 1 - tk / life;
        ctx.strokeStyle = k % 2 ? '#111' : COLORS[k / 2 % COLORS.length | 0];
        ctx.lineWidth = 16 * (1 - tk / life) + 2;
        ctx.beginPath();
        ctx.arc(x, y, tk * maxR * 0.9, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return t < rings * gap + life;
    });
  }

  // A grid of dots that swell as a wave passes through them (think Bridget Riley).
  function dotWave(x, y) {
    const gap = 34, life = 1.9;
    const reach = Math.hypot(W, H);
    let t = 0;
    add(dt => {
      t += dt;
      const front = (t / life) * (reach + 200);
      const fade = t > life - 0.4 ? (life - t) / 0.4 : 1;
      for (let gy = gap / 2; gy < H; gy += gap) {
        for (let gx = gap / 2; gx < W; gx += gap) {
          const d = Math.hypot(gx - x, gy - y);
          const k = (d - front) / 110;
          const r = 12 * Math.exp(-k * k) * fade;
          if (r < 0.6) continue;
          ctx.fillStyle = COLORS[Math.floor(d / 90) % COLORS.length];
          ctx.beginPath();
          ctx.arc(gx, gy, r, 0, TAU);
          ctx.fill();
        }
      }
      return t < life;
    });
  }

  // Spiral arms of dots spinning out from a point.
  function swirl(x, y) {
    const arms = 6, dots = 16, life = 1.5;
    let t = 0;
    add(dt => {
      t += dt;
      const p = t / life;
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      for (let a = 0; a < arms; a++) {
        ctx.fillStyle = COLORS[a % COLORS.length];
        for (let j = 0; j < dots; j++) {
          const ang = a * TAU / arms + t * 5 + j * 0.32;
          const rad = (40 + p * 520) * (j + 2) / (dots + 2);
          ctx.beginPath();
          ctx.arc(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, 2 + (dots - j) * 0.55, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return t < life;
    });
  }

  // Puzzle blocks that drop from the top and bounce on the bottom of the screen.
  const TETROMINOES = [
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
  ];
  function blocks(count) {
    const cell = Math.max(18, Math.min(30, W / 18));
    const bs = [];
    for (let i = 0; i < count; i++) {
      bs.push({
        cells: pick(TETROMINOES), color: pick(COLORS),
        x: rnd(0, W - cell * 4), y: rnd(-H * 0.8, -cell * 4), vy: rnd(0, 200), bounces: 0,
      });
    }
    let t = 0;
    const life = 2.6;
    add(dt => {
      t += dt;
      const alpha = t > life - 0.5 ? (life - t) / 0.5 : 1;
      ctx.globalAlpha = Math.max(0, alpha);
      for (const b of bs) {
        b.vy += 1400 * dt;
        b.y += b.vy * dt;
        const height = (Math.max(...b.cells.map(c => c[1])) + 1) * cell;
        if (b.y + height > H && b.vy > 0) {
          b.y = H - height;
          b.vy = b.bounces++ < 3 ? -b.vy * 0.45 : 0;
        }
        ctx.fillStyle = b.color;
        for (const [cx, cy] of b.cells) ctx.fillRect(b.x + cx * cell + 1.5, b.y + cy * cell + 1.5, cell - 3, cell - 3);
      }
      ctx.globalAlpha = 1;
      return t < life;
    });
  }

  function centreOf(el) {
    if (!el) return { x: W / 2, y: H / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function confetti() {
    const n = reduced ? 12 : 60;
    shapes(0, H, { count: n, angle: -Math.PI / 3, spread: 0.7, speed: Math.max(W, H) * 1.1, life: 2.2 });
    shapes(W, H, { count: n, angle: -2 * Math.PI / 3, spread: 0.7, speed: Math.max(W, H) * 1.1, life: 2.2 });
  }

  // Ready-made celebrations used by the game.
  root.FX = {
    // Small pop for every right answer.
    pop(el) {
      const c = centreOf(el);
      shapes(c.x, c.y, { count: reduced ? 6 : 16, speed: 360, size: [6, 13], life: 0.9 });
    },
    // Streak milestones: 3, 5, 7, 10, then every 5.
    streak(n, el) {
      const c = centreOf(el);
      if (reduced) { shapes(c.x, c.y, { count: 14 }); return; }
      const kind = n === 3 ? 0 : n === 5 ? 1 : n === 7 ? 2 : n === 10 ? 3 : (n / 5) % 4;
      if (kind === 0) swirl(c.x, c.y);
      else if (kind === 1) { ripples(c.x, c.y); shapes(c.x, c.y, { count: 30, speed: 600 }); }
      else if (kind === 2) blocks(10);
      else { dotWave(c.x, c.y); confetti(); }
    },
    roundDone() { confetti(); },
    topThree(el) { const c = centreOf(el); confetti(); if (!reduced) ripples(c.x, c.y); },
    newBest(el) {
      const c = centreOf(el);
      confetti();
      if (reduced) return;
      dotWave(c.x, c.y);
      setTimeout(() => blocks(14), 500);
      setTimeout(() => swirl(c.x, c.y), 900);
    },
    puzzleDone(el) {
      const c = centreOf(el);
      if (!reduced) { swirl(c.x, c.y); ripples(c.x, c.y); }
      setTimeout(confetti, 300);
    },
  };
})(this);
