/* Screens, the round loop and the grown-ups' settings. */
(function () {
  'use strict';

  const PLAYER_COLORS = {
    blue: '#2D5BFF', pink: '#FF3D7F', green: '#00A884', violet: '#7B4DFF', orange: '#F26B00',
  };
  const MODE_LABEL = { m: '×', d: '÷', mix: '× ÷' };
  const PRAISE = ['Yes!', 'Brilliant!', 'Nailed it!', 'Spot on!', 'Super!', 'Correct!', 'Ace!', 'Smashed it!'];
  const MILESTONES = [3, 5, 7, 10];

  const ICONS = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0V3zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    puzzle: '<svg viewBox="0 0 24 24"><path d="M4 8h4a2.5 2.5 0 1 1 5 0h4v4a2.5 2.5 0 1 1 0 5v4H4v-4.5a2.5 2.5 0 1 0 0-5V8z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
    sliders: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="9" cy="6" r="2.6" fill="#fff" stroke="currentColor" stroke-width="2.4"/><circle cx="15" cy="12" r="2.6" fill="#fff" stroke="currentColor" stroke-width="2.4"/><circle cx="8" cy="18" r="2.6" fill="#fff" stroke="currentColor" stroke-width="2.4"/></svg>',
  };

  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let data = Store.load();
  let screen = 'players';
  let settingsReturn = 'players';
  let round = null;
  let lastResult = null;
  let progressPlayerId = null;

  const save = () => Store.save(data);
  const player = () => data.players.find(p => p.id === data.currentPlayerId);
  const roundLength = () => data.settings.roundLength;

  function setAccent(color) {
    const hex = PLAYER_COLORS[color] || PLAYER_COLORS.blue;
    const n = parseInt(hex.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
    document.body.style.setProperty('--accent', hex);
    document.body.style.setProperty('--accent-soft', `rgba(${rgb},0.12)`);
    document.body.style.setProperty('--accent-mid', `rgba(${rgb},0.35)`);
  }

  function show(name) {
    screen = name;
    for (const s of $$('.screen')) s.hidden = s.id !== 'screen-' + name;
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
  }

  function go(target) {
    if (target === 'back') target = settingsReturn;
    if (target === 'settings') settingsReturn = screen;
    const render = {
      players: renderPlayers, home: renderHome, leaderboard: renderLeaderboard,
      puzzle: renderPuzzle, settings: renderSettings,
    }[target];
    if (render) render();
    show(target);
  }

  // In-page confirmation (browser confirm() boxes are blocked in some app views).
  let onConfirm = null;
  function ask(text, okLabel, onOk) {
    $('#dialog-text').textContent = text;
    $('#dialog-ok').textContent = okLabel;
    onConfirm = onOk;
    $('#dialog').hidden = false;
    $('#dialog-cancel').focus();
  }
  function closeDialog(ok) {
    $('#dialog').hidden = true;
    const fn = onConfirm;
    onConfirm = null;
    if (ok && fn) fn();
  }

  // ---------- Who's playing ----------

  function renderPlayers() {
    setAccent('blue');
    $('#player-list').innerHTML = data.players.map(p => {
      const best = Game.bestScore(p.rounds, roundLength());
      return `<button class="player-tile" type="button" data-player="${p.id}" style="--tile:${PLAYER_COLORS[p.color]}">
        <span class="tile-dot"></span>
        <span class="tile-name">${esc(p.name)}</span>
        <span class="tile-best">${best === null ? 'No score yet' : 'Best ' + best}</span>
      </button>`;
    }).join('');
  }

  // ---------- Home ----------

  function scoreToBeatHTML(p) {
    const best = Game.bestScore(p.rounds, roundLength());
    return best === null
      ? '<span class="to-beat-label">Play a round to set your first score!</span>'
      : `<span class="to-beat-label">Score to beat</span><span class="to-beat-num">${best}</span>`;
  }

  function renderHome() {
    const p = player();
    setAccent(p.color);
    $('#hello').textContent = 'Hi ' + p.name + '!';
    $('#home-to-beat').innerHTML = scoreToBeatHTML(p);
    for (const b of $$('#mode-picker button')) b.setAttribute('aria-checked', String(b.dataset.mode === p.mode));
    $('#table-picker').innerHTML = Store.ALL_TABLES.map(t =>
      `<button type="button" class="chip" data-table="${t}" aria-pressed="${p.tables.indexOf(t) >= 0}">${t}</button>`).join('');
    $('#all-tables').textContent = p.tables.length === 12 ? 'Clear' : 'All';
    $('#start').disabled = !p.tables.length;
    $('#start').textContent = p.tables.length ? 'Start' : 'Pick some tables';
    $('#home-puzzle').innerHTML = Puzzle.render(p.puzzle.number, p.puzzle.pieces) +
      `<span><b>${p.puzzle.pieces.length} of ${Puzzle.PIECES}</b> puzzle pieces</span>`;
  }

  // ---------- The round ----------

  function startRound() {
    const p = player();
    if (!p.tables.length) return;
    Sound.unlock();
    round = {
      questions: Game.pickQuestions(roundLength(), p.tables, p.mode, p.facts),
      marks: [],
      index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0,
      input: '', locked: false, waiting: false,
      toBeat: Game.bestScore(p.rounds, roundLength()),
    };
    show('game');
    renderQuestion();
  }

  function renderProgress() {
    $('#progress').innerHTML = round.questions.map((q, i) => {
      const cls = i < round.marks.length ? (round.marks[i] ? 'done' : 'missed') : i === round.index ? 'now' : '';
      return `<i class="${cls}"></i>`;
    }).join('');
  }

  function renderStreak() {
    const n = round.streak;
    const dots = Array.from({ length: Math.min(n, 10) }, (_, i) => `<i style="animation-delay:${i * 40}ms"></i>`).join('');
    $('#streak').innerHTML = n >= 2 ? `${dots}<span>${n} in a row</span>` : '';
  }

  function renderBeatLine() {
    const el = $('#beat-line');
    if (round.toBeat === null) el.textContent = '';
    else if (round.score > round.toBeat) { el.textContent = 'New high score!'; el.classList.add('beaten'); }
    else { el.textContent = 'Score to beat ' + round.toBeat; el.classList.remove('beaten'); }
  }

  function renderQuestion() {
    const q = round.questions[round.index];
    $('#question').textContent = Game.describe(q).text;
    $('#retry-tag').hidden = !q.retry;
    $('#feedback').innerHTML = '';
    $('#answer').className = 'answer';
    $('#enter-key').textContent = 'Go';
    $('#enter-key').classList.remove('nudge');
    round.input = '';
    round.locked = false;
    round.waiting = false;
    renderAnswer();
    renderProgress();
    renderStreak();
    renderBeatLine();
    $('#score').textContent = round.score;
  }

  function renderAnswer() {
    $('#answer').textContent = round.input;
    $('#answer').classList.toggle('empty', !round.input);
  }

  function press(key) {
    if (screen !== 'game' || !round) return;
    if (round.waiting) { if (key === 'enter') nextQuestion(); return; }
    if (round.locked) return;
    if (/^\d$/.test(key)) {
      if (round.input.length < 3) round.input = (round.input === '0' ? '' : round.input) + key;
    } else if (key === 'back') {
      round.input = round.input.slice(0, -1);
    } else if (key === 'enter') {
      submit();
      return;
    }
    renderAnswer();
  }

  function submit() {
    if (!round.input) return;
    const p = player();
    const q = round.questions[round.index];
    const d = Game.describe(q);
    const ok = parseInt(round.input, 10) === d.answer;
    Game.recordFact(p.facts, q, ok);
    round.marks[round.index] = ok;
    const answerEl = $('#answer');

    if (ok) {
      round.streak++;
      round.correct++;
      round.bestStreak = Math.max(round.bestStreak, round.streak);
      const pts = Game.pointsFor(round.streak, !!q.retry);
      round.score += pts;
      round.locked = true;
      answerEl.classList.add('correct');
      $('#feedback').innerHTML = `<span class="praise">${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</span>`;
      floatPoints('+' + pts);
      $('#score').textContent = round.score;
      renderStreak();
      renderBeatLine();
      renderProgress();

      const milestone = MILESTONES.indexOf(round.streak) >= 0 || (round.streak > 10 && round.streak % 5 === 0);
      if (milestone) { FX.streak(round.streak, answerEl); Sound.streak(); }
      else { FX.pop(answerEl); Sound.correct(); }
      const current = round;
      setTimeout(() => { if (round === current) nextQuestion(); }, milestone ? 1300 : 850);
    } else {
      round.streak = 0;
      round.waiting = true;
      answerEl.classList.add('wrong');
      const again = Game.scheduleRetry(round.questions, round.index) >= 0;
      $('#feedback').innerHTML =
        `<span class="nearly">Nearly! <b>${d.text} = ${d.answer}</b></span>` +
        (again ? '<small>You\'ll get another go at this one soon.</small>' : '');
      $('#enter-key').textContent = 'Next';
      $('#enter-key').classList.add('nudge');
      Sound.wrong();
      renderStreak();
      renderProgress();
    }
    save();
  }

  function floatPoints(text) {
    const el = $('#float-points');
    el.textContent = text;
    el.classList.remove('go');
    void el.offsetWidth; // restart the animation
    el.classList.add('go');
  }

  function nextQuestion() {
    if (screen !== 'game' || !round) return;
    round.index++;
    if (round.index >= round.questions.length) finishRound();
    else renderQuestion();
  }

  function finishRound() {
    const p = player();
    const total = round.questions.length;
    const prevBest = Game.bestScore(p.rounds, total);
    const entry = {
      id: Store.uid(), score: round.score, correct: round.correct, total,
      mode: p.mode, bestStreak: round.bestStreak, date: Date.now(),
    };
    const rank = Game.rankOf(p.rounds, total, entry.score);
    const newBest = prevBest !== null && entry.score > prevBest;
    const toBoard = Game.pointsToBoard(p.rounds, total, entry.score);
    p.rounds.push(entry);
    trimRounds(p, total);

    const earned = Game.piecesEarned(round.correct, total, newBest);
    const puzzle = Puzzle.addPieces(p.puzzle, earned);
    save();

    lastResult = { entry, rank, newBest, first: prevBest === null, prevBest, toBoard, earned, puzzle };
    round = null;
    renderResults();
    show('results');
    celebrate();
  }

  // Keep the 50 best rounds of each length; the leaderboard only shows 10.
  function trimRounds(p, total) {
    const keep = new Set(Game.leaderboard(p.rounds, total).slice(0, 50).map(r => r.id));
    p.rounds = p.rounds.filter(r => r.total !== total || keep.has(r.id));
  }

  // ---------- Results ----------

  function renderResults() {
    const p = player();
    const r = lastResult;
    const e = r.entry;
    setAccent(p.color);

    $('#result-head').textContent =
      r.newBest ? 'New high score!' : r.first ? 'Your first score!' : 'Round complete, ' + p.name + '!';
    $('#result-score').textContent = e.score;
    $('#result-detail').textContent =
      `${e.correct} out of ${e.total} right` + (e.bestStreak >= 2 ? ` · ${e.bestStreak} in a row` : '');

    let placing;
    if (r.first) placing = 'Now try to beat it!';
    else if (r.newBest) placing = `You beat ${r.prevBest}. You're <b>1st</b> on your leaderboard!`;
    else if (r.rank === 1) placing = 'You equalled your top score!';
    else if (r.rank <= Game.LEADERBOARD_SIZE) placing = `You came <b>${Game.ordinal(r.rank)}</b> on your leaderboard!`;
    else placing = `Just <b>${r.toBoard + 1}</b> more points to get on your leaderboard. Keep going!`;
    const medal = r.rank <= 3 ? `<span class="medal m${r.rank}">${r.rank}</span>` : '';
    $('#placing').innerHTML = medal + `<span>${placing}</span>`;

    const done = r.puzzle.completed;
    let card;
    if (done.length) {
      const last = done[done.length - 1];
      card = Puzzle.render(last, Array.from({ length: Puzzle.PIECES }, (_, i) => i)) +
        `<div><b>Puzzle complete!</b><span>You finished “${Puzzle.name(last)}”. A new puzzle has started.</span></div>`;
    } else {
      card = Puzzle.render(p.puzzle.number, p.puzzle.pieces, r.puzzle.fresh) +
        `<div><b>+${r.earned} puzzle piece${r.earned > 1 ? 's' : ''}</b><span>${p.puzzle.pieces.length} of ${Puzzle.PIECES} collected</span></div>`;
    }
    $('#pieces-card').innerHTML = card;
    $('#pieces-card').classList.toggle('complete', done.length > 0);
  }

  function celebrate() {
    const r = lastResult;
    const scoreEl = $('#result-score');
    setTimeout(() => {
      if (r.newBest || r.first) { FX.newBest(scoreEl); Sound.fanfare(); }
      else if (r.rank <= 3) { FX.topThree(scoreEl); Sound.fanfare(); }
      else { FX.roundDone(); Sound.streak(); }
      if (r.puzzle.completed.length) setTimeout(() => FX.puzzleDone($('#pieces-card')), 1600);
    }, 250);
  }

  // ---------- Leaderboard ----------

  function renderLeaderboard() {
    const p = player();
    setAccent(p.color);
    const len = roundLength();
    const board = Game.leaderboard(p.rounds, len).slice(0, Game.LEADERBOARD_SIZE);
    $('#lb-title').textContent = p.name + "'s leaderboard";
    $('#lb-sub').textContent = `Best scores for rounds of ${len} questions`;
    if (!board.length) {
      $('#board').innerHTML = '<li class="empty">No scores yet. Play a round to get on the board!</li>';
      return;
    }
    const highlight = lastResult && lastResult.entry.id;
    $('#board').innerHTML = board.map(r => {
      const rank = Game.rankOf(p.rounds, len, r.score);
      const date = new Date(r.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `<li class="${r.id === highlight ? 'latest' : ''}">
        <span class="rank${rank <= 3 ? ' m' + rank : ''}">${rank}</span>
        <span class="lb-score">${r.score}</span>
        <span class="lb-meta"><span class="mode-tag">${MODE_LABEL[r.mode]}</span>${r.correct}/${r.total} · ${date}</span>
      </li>`;
    }).join('');
  }

  // ---------- Puzzle ----------

  function renderPuzzle() {
    const p = player();
    setAccent(p.color);
    const pz = p.puzzle;
    $('#pz-title').textContent = p.name + "'s puzzle";
    $('#pz-sub').textContent = `${pz.pieces.length} of ${Puzzle.PIECES} pieces`;
    $('#puzzle-big').innerHTML = Puzzle.render(pz.number, pz.pieces);
    const all = Array.from({ length: Puzzle.PIECES }, (_, i) => i);
    $('#gallery-label').hidden = !pz.completed.length;
    $('#gallery').innerHTML = pz.completed.slice().reverse().map(n =>
      `<figure>${Puzzle.render(n, all)}<figcaption>${Puzzle.name(n)}</figcaption></figure>`).join('');
  }

  // ---------- Grown-ups ----------

  function renderSettings() {
    setAccent('blue');
    const sw = $('#sound-switch');
    sw.setAttribute('aria-checked', String(data.settings.sound));
    for (const b of $$('#length-picker button')) b.setAttribute('aria-checked', String(+b.dataset.len === roundLength()));

    $('#player-edit').innerHTML = data.players.map(p => `
      <div class="player-row" data-player="${p.id}">
        <button class="color-dot" type="button" data-action="color" style="background:${PLAYER_COLORS[p.color]}" aria-label="Change colour"></button>
        <input type="text" value="${esc(p.name)}" maxlength="16" data-action="name" aria-label="Name">
        ${data.players.length > 1 ? '<button class="text-btn" type="button" data-action="remove">Remove</button>' : ''}
      </div>`).join('');

    if (!data.players.some(p => p.id === progressPlayerId)) {
      progressPlayerId = (player() || data.players[0]).id;
    }
    $('#progress-tabs').innerHTML = data.players.map(p =>
      `<button type="button" class="chip wide" data-progress="${p.id}" aria-pressed="${p.id === progressPlayerId}">${esc(p.name)}</button>`).join('');
    renderFactGrid();
  }

  function renderFactGrid() {
    const p = data.players.find(x => x.id === progressPlayerId);
    let html = '<table class="fact-grid"><thead><tr><th>×</th>';
    for (let b = 1; b <= 12; b++) html += `<th>${b}</th>`;
    html += '</tr></thead><tbody>';
    const tricky = [];
    for (let a = 1; a <= 12; a++) {
      html += `<tr><th>${a}</th>`;
      for (let b = 1; b <= 12; b++) {
        const s = Game.factSummary(p.facts, a, b);
        let cls = 'unseen';
        if (s.seen) cls = s.accuracy >= 0.85 ? 'good' : s.accuracy >= 0.6 ? 'ok' : 'tricky';
        if (s.seen >= 2 && s.accuracy < 0.85) tricky.push({ a, b, acc: s.accuracy, seen: s.seen });
        const label = s.seen ? `${a} × ${b}: ${s.correct} of ${s.seen} right` : `${a} × ${b}: not tried yet`;
        html += `<td class="${cls}" title="${label}"><span class="sr">${label}</span></td>`;
      }
      html += '</tr>';
    }
    $('#fact-grid').innerHTML = html + '</tbody></table>';
    tricky.sort((x, y) => x.acc - y.acc || y.seen - x.seen);
    $('#tricky-list').innerHTML = tricky.length
      ? '<b>Trickiest right now:</b> ' + tricky.slice(0, 6).map(t => `${t.a} × ${t.b}`).join(', ') +
        '. These come up more often in rounds.'
      : 'No tricky facts yet. They’ll show here once ' + esc(p.name) + ' has played a few rounds.';
    $('#reset-player').textContent = `Reset ${p.name}'s scores and puzzles`;
  }

  // ---------- Events ----------

  document.addEventListener('click', e => {
    if (e.target.id === 'dialog') { closeDialog(false); return; }
    const t = e.target.closest('button');
    if (!t) return;
    if (t.id === 'dialog-ok' || t.id === 'dialog-cancel') { closeDialog(t.id === 'dialog-ok'); return; }

    if (t.dataset.go) { go(t.dataset.go); return; }

    if (t.dataset.player && t.classList.contains('player-tile')) {
      data.currentPlayerId = t.dataset.player;
      save();
      Sound.unlock();
      go('home');
      return;
    }

    if (t.dataset.key) { Sound.tap(); press(t.dataset.key); return; }

    const p = player();
    if (t.dataset.mode) { p.mode = t.dataset.mode; save(); renderHome(); return; }
    if (t.dataset.table) {
      const n = +t.dataset.table;
      const i = p.tables.indexOf(n);
      if (i >= 0) p.tables.splice(i, 1); else p.tables.push(n);
      p.tables.sort((x, y) => x - y);
      save();
      renderHome();
      return;
    }
    if (t.id === 'all-tables') {
      p.tables = p.tables.length === 12 ? [] : Store.ALL_TABLES.slice();
      save();
      renderHome();
      return;
    }
    if (t.id === 'start' || t.id === 'again') { startRound(); return; }
    if (t.id === 'quit') {
      ask('Stop this round? It won’t count on the leaderboard.', 'Stop', () => { round = null; go('home'); });
      return;
    }

    // Grown-ups
    if (t.id === 'sound-switch') {
      data.settings.sound = !data.settings.sound;
      Sound.setEnabled(data.settings.sound);
      save();
      renderSettings();
      return;
    }
    if (t.dataset.len) { data.settings.roundLength = +t.dataset.len; save(); renderSettings(); return; }
    if (t.dataset.progress) { progressPlayerId = t.dataset.progress; renderSettings(); return; }
    if (t.id === 'add-player') {
      const used = new Set(data.players.map(x => x.color));
      const color = Object.keys(PLAYER_COLORS).find(c => !used.has(c)) || 'blue';
      data.players.push(Store.newPlayer('Player ' + (data.players.length + 1), color));
      save();
      renderSettings();
      return;
    }
    if (t.id === 'reset-player') {
      const target = data.players.find(x => x.id === progressPlayerId);
      ask(`Reset all of ${target.name}'s scores, puzzles and progress? This can't be undone.`, 'Reset', () => {
        Object.assign(target, Store.newPlayer(target.name, target.color), { id: target.id });
        save();
        renderSettings();
      });
      return;
    }
    const row = t.closest('.player-row');
    if (row) {
      const target = data.players.find(x => x.id === row.dataset.player);
      if (t.dataset.action === 'color') {
        const keys = Object.keys(PLAYER_COLORS);
        target.color = keys[(keys.indexOf(target.color) + 1) % keys.length];
      } else if (t.dataset.action === 'remove') {
        ask(`Remove ${target.name} and all their scores?`, 'Remove', () => {
          data.players = data.players.filter(x => x !== target);
          if (data.currentPlayerId === target.id) data.currentPlayerId = null;
          if (settingsReturn !== 'players' && !player()) settingsReturn = 'players';
          save();
          renderSettings();
        });
        return;
      }
      save();
      renderSettings();
    }
  });

  document.addEventListener('input', e => {
    if (e.target.dataset.action !== 'name') return;
    const target = data.players.find(x => x.id === e.target.closest('.player-row').dataset.player);
    target.name = e.target.value.trim() || 'Player';
    save();
    $$('#progress-tabs .chip').forEach(c => {
      const p = data.players.find(x => x.id === c.dataset.progress);
      if (p) c.textContent = p.name;
    });
  });

  // Physical keyboards (iPad keyboard, laptop).
  document.addEventListener('keydown', e => {
    if (!$('#dialog').hidden) { if (e.key === 'Escape') closeDialog(false); return; }
    if (screen !== 'game' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('back');
    else if (e.key === 'Enter') press('enter');
    else return;
    e.preventDefault();
  });

  // ---------- Start up ----------

  for (const b of $$('[data-go="players"], [data-go="home"], [data-go="back"]')) b.innerHTML = ICONS.back;
  for (const b of $$('.icon-btn[data-go="leaderboard"]')) b.innerHTML = ICONS.trophy;
  for (const b of $$('.icon-btn[data-go="puzzle"]')) b.innerHTML = ICONS.puzzle;
  for (const b of $$('.soft-btn[data-go="home"]')) b.textContent = 'Home';
  $('#quit').innerHTML = ICONS.close;
  $('.grown-ups').innerHTML = ICONS.sliders + '<span>Grown-ups</span>';

  Sound.setEnabled(data.settings.sound);
  renderPlayers();
  show('players');
})();
