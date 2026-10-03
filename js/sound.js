/* Little synthesised sounds, so there are no audio files to load. */
(function (root) {
  'use strict';

  let ctx = null;
  let enabled = true;

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function note(freq, start, dur, type, vol) {
    const c = audio();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const t = c.currentTime + start;
    osc.type = type || 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function play(fn) { if (enabled) fn(); }

  root.Sound = {
    setEnabled(v) { enabled = !!v; },
    // Call from a tap so iOS lets audio start.
    unlock() { if (enabled) audio(); },
    tap() { play(() => note(900, 0, 0.04, 'sine', 0.03)); },
    correct() { play(() => { note(784, 0, 0.12); note(1175, 0.08, 0.2); }); },
    wrong() { play(() => { note(330, 0, 0.18, 'sine', 0.08); note(262, 0.12, 0.26, 'sine', 0.08); }); },
    streak() { play(() => [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.07, 0.16, 'square', 0.05))); },
    fanfare() {
      play(() => {
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.09, 0.22, 'square', 0.05));
        note(1568, 0.7, 0.5, 'triangle', 0.12);
      });
    },
  };
})(this);
