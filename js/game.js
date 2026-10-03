/* Game rules: picking questions, scoring, leaderboard placement and rewards.
   Pure functions only, so they can be tested without a browser. */
(function (root) {
  'use strict';

  const POINTS_CORRECT = 10;
  const STREAK_STEP = 2;     // each answer in a row is worth 2 more...
  const STREAK_CAP = 10;     // ...up to +10
  const COMEBACK_BONUS = 5;  // for getting a missed fact right later in the round
  const LEADERBOARD_SIZE = 10;

  function factKey(a, b) { return a + 'x' + b; }

  // Smoothed error rate: an unseen fact sits at 0.5, a fact that is
  // always right drifts towards 0, a fact that is often wrong towards 1.
  function errorRate(stat) {
    const seen = stat ? stat.seen : 0;
    const correct = stat ? stat.correct : 0;
    return (seen - correct + 1) / (seen + 2);
  }

  function weightFor(facts, q) {
    const fact = facts[factKey(q.a, q.b)];
    return 0.5 + 4 * errorRate(fact && fact[q.op]);
  }

  function candidates(tables, mode) {
    const ops = mode === 'mix' ? ['m', 'd'] : [mode];
    const out = [];
    for (const a of tables) {
      for (let b = 1; b <= 12; b++) {
        for (const op of ops) out.push({ a, b, op });
      }
    }
    return out;
  }

  // Weighted sampling without replacement: tricky facts come up more often.
  function pickQuestions(n, tables, mode, facts, rand) {
    rand = rand || Math.random;
    let pool = candidates(tables, mode);
    const chosen = [];
    while (chosen.length < n) {
      if (!pool.length) pool = candidates(tables, mode);
      const weights = pool.map(q => weightFor(facts, q));
      let r = rand() * weights.reduce((s, w) => s + w, 0);
      let i = 0;
      while (i < pool.length - 1 && r >= weights[i]) { r -= weights[i]; i++; }
      const q = pool.splice(i, 1)[0];
      q.swap = q.op === 'm' && rand() < 0.5; // show 8 × 7 as well as 7 × 8
      chosen.push(q);
    }
    return chosen;
  }

  function describe(q) {
    if (q.op === 'm') {
      return { text: q.swap ? q.b + ' × ' + q.a : q.a + ' × ' + q.b, answer: q.a * q.b };
    }
    return { text: (q.a * q.b) + ' ÷ ' + q.a, answer: q.b };
  }

  // streak = answers in a row including this one
  function pointsFor(streak, isRetry) {
    const bonus = Math.min(STREAK_CAP, STREAK_STEP * Math.max(0, streak - 1));
    return POINTS_CORRECT + bonus + (isRetry ? COMEBACK_BONUS : 0);
  }

  // Bring a missed fact back 2–3 questions later by replacing a future
  // question, so the round length stays the same. Returns the slot or -1.
  function scheduleRetry(questions, index) {
    const last = Math.min(index + 3, questions.length - 1);
    for (let j = index + 2; j <= last; j++) {
      if (!questions[j].retry) {
        questions[j] = Object.assign({}, questions[index], { retry: true });
        return j;
      }
    }
    return -1;
  }

  function recordFact(facts, q, ok) {
    const key = factKey(q.a, q.b);
    const fact = facts[key] || (facts[key] = {});
    const stat = fact[q.op] || (fact[q.op] = { seen: 0, correct: 0 });
    stat.seen++;
    if (ok) stat.correct++;
  }

  // Combined accuracy for a fact across × and ÷ (for the grown-ups' grid).
  function factSummary(facts, a, b) {
    const fact = facts[factKey(a, b)] || {};
    let seen = 0, correct = 0;
    for (const op of ['m', 'd']) {
      if (fact[op]) { seen += fact[op].seen; correct += fact[op].correct; }
    }
    return { seen, correct, accuracy: seen ? correct / seen : null };
  }

  function bestScore(rounds, total) {
    let best = null;
    for (const r of rounds) if (r.total === total && (best === null || r.score > best)) best = r.score;
    return best;
  }

  // Leaderboard order: highest score first, earlier rounds win ties.
  function leaderboard(rounds, total) {
    return rounds
      .filter(r => r.total === total)
      .sort((x, y) => y.score - x.score || x.date - y.date);
  }

  // Competition ranking (1, 2, 2, 4) so equal scores share a place.
  function rankOf(rounds, total, score) {
    return 1 + rounds.filter(r => r.total === total && r.score > score).length;
  }

  // Points needed to get onto the top 10 (0 if already on it).
  function pointsToBoard(rounds, total, score) {
    const board = leaderboard(rounds, total);
    if (board.length < LEADERBOARD_SIZE) return 0;
    const tenth = board[LEADERBOARD_SIZE - 1].score;
    return score >= tenth ? 0 : tenth - score;
  }

  function piecesEarned(correct, total, newBest) {
    let pieces = 1;                     // for finishing a round
    if (correct === total) pieces++;    // perfect round
    if (newBest) pieces++;              // beat the high score
    return pieces;
  }

  function ordinal(n) {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  }

  const Game = {
    LEADERBOARD_SIZE, factKey, errorRate, pickQuestions, describe, pointsFor,
    scheduleRetry, recordFact, factSummary, bestScore, leaderboard, rankOf,
    pointsToBoard, piecesEarned, ordinal,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Game;
  else root.Game = Game;
})(this);
