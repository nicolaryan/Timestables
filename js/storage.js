/* Saves everything in this browser's localStorage. */
(function (root) {
  'use strict';

  const KEY = 'timestables.v1';
  const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function newPlayer(name, color) {
    return {
      id: uid(),
      name,
      color,
      mode: 'mix',
      tables: ALL_TABLES.slice(),
      rounds: [],
      facts: {},
      puzzle: { number: 0, pieces: [], completed: [] },
    };
  }

  function defaults() {
    return {
      settings: { roundLength: 10, sound: true },
      players: [newPlayer('Bailey', 'blue'), newPlayer('Cora', 'pink')],
      currentPlayerId: null,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.players) || !data.players.length) return defaults();
      data.settings = Object.assign(defaults().settings, data.settings);
      return data;
    } catch (e) {
      return defaults();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // Private browsing or storage full: the game still works, it just won't remember.
    }
  }

  root.Store = { load, save, newPlayer, uid, ALL_TABLES };
})(this);
