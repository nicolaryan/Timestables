// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const Game = require('../js/game.js');

test('questions use only the chosen tables and modes', () => {
  const qs = Game.pickQuestions(50, [7, 8], 'd', {});
  assert.strictEqual(qs.length, 50);
  for (const q of qs) {
    assert.ok([7, 8].includes(q.a));
    assert.strictEqual(q.op, 'd');
    const d = Game.describe(q);
    const [dividend, divisor] = d.text.split(' ÷ ').map(Number);
    assert.strictEqual(dividend / divisor, d.answer);
    assert.ok(Number.isInteger(d.answer) && d.answer >= 1 && d.answer <= 12);
  }
});

test('no repeated questions in a round when there are enough facts', () => {
  const qs = Game.pickQuestions(20, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'mix', {});
  const keys = new Set(qs.map(q => q.a + q.op + q.b));
  assert.strictEqual(keys.size, 20);
});

test('tricky facts come up more often', () => {
  const facts = { '7x8': { m: { seen: 10, correct: 2 } } };
  for (let b = 1; b <= 12; b++) if (b !== 8) facts['7x' + b] = { m: { seen: 10, correct: 10 } };
  let hits = 0;
  for (let i = 0; i < 2000; i++) {
    const [q] = Game.pickQuestions(1, [7], 'm', facts);
    if (q.b === 8) hits++;
  }
  // Uniform would be ~1/12 (≈167); weighted should be far more.
  assert.ok(hits > 500, 'got ' + hits);
});

test('scoring rewards streaks, capped, plus comeback bonus', () => {
  assert.strictEqual(Game.pointsFor(1, false), 10);
  assert.strictEqual(Game.pointsFor(2, false), 12);
  assert.strictEqual(Game.pointsFor(6, false), 20);
  assert.strictEqual(Game.pointsFor(20, false), 20);
  assert.strictEqual(Game.pointsFor(1, true), 15);
});

test('missed facts come back later in the round without changing its length', () => {
  const qs = Game.pickQuestions(10, [6], 'm', {});
  const slot = Game.scheduleRetry(qs, 2);
  assert.strictEqual(qs.length, 10);
  assert.ok(slot === 4 || slot === 5);
  assert.strictEqual(qs[slot].a, qs[2].a);
  assert.strictEqual(qs[slot].b, qs[2].b);
  assert.strictEqual(qs[slot].retry, true);
  assert.strictEqual(Game.scheduleRetry(qs, 9), -1);
});

test('leaderboard ranking shares places on ties and is per round length', () => {
  const rounds = [
    { score: 100, total: 10, date: 1 }, { score: 150, total: 10, date: 2 },
    { score: 100, total: 10, date: 3 }, { score: 400, total: 20, date: 4 },
  ];
  assert.strictEqual(Game.bestScore(rounds, 10), 150);
  assert.strictEqual(Game.bestScore(rounds, 5), null);
  assert.strictEqual(Game.rankOf(rounds, 10, 160), 1);
  assert.strictEqual(Game.rankOf(rounds, 10, 100), 2);
  assert.strictEqual(Game.rankOf(rounds, 10, 50), 4);
  assert.deepStrictEqual(Game.leaderboard(rounds, 10).map(r => r.date), [2, 1, 3]);
});

test('points needed to reach the top 10', () => {
  const rounds = Array.from({ length: 10 }, (_, i) => ({ score: 100 + i * 10, total: 10, date: i }));
  assert.strictEqual(Game.pointsToBoard(rounds, 10, 90), 10);
  assert.strictEqual(Game.pointsToBoard(rounds, 10, 100), 0);
  assert.strictEqual(Game.pointsToBoard(rounds.slice(0, 5), 10, 0), 0);
});

test('puzzle pieces and ordinals', () => {
  assert.strictEqual(Game.piecesEarned(4, 10, false), 1);
  assert.strictEqual(Game.piecesEarned(10, 10, false), 2);
  assert.strictEqual(Game.piecesEarned(10, 10, true), 3);
  assert.deepStrictEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(Game.ordinal),
    ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
});

test('fact summary combines × and ÷', () => {
  const facts = {};
  Game.recordFact(facts, { a: 7, b: 8, op: 'm' }, true);
  Game.recordFact(facts, { a: 7, b: 8, op: 'd' }, false);
  const s = Game.factSummary(facts, 7, 8);
  assert.deepStrictEqual([s.seen, s.correct, s.accuracy], [2, 1, 0.5]);
});
