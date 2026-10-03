# Times Tables

A calm, minimal times tables game (up to 12 × 12) for practising multiplication and division. It has no timers, and it gives bright op-art surprises when you do well.

## What's in it

- **Players**: each child has their own scores, leaderboard, puzzle and progress. Bailey and Cora are set up to start with. You can add, rename or recolour players under **Grown-ups**.
- **Modes**: ×, ÷ or a mix. Pick any set of tables from 1 to 12.
- **No timer**: points come from accuracy and streaks, never from speed.
  - +10 for each right answer
  - a streak bonus of +2 per answer in a row, up to +10
  - +5 comeback bonus for getting a missed fact right
- **Gentle mistakes**: a wrong answer shows the right one, and that fact comes back a couple of questions later.
- **Leaderboard**: a personal top 10 with a "score to beat". Each round length has its own leaderboard.
- **Surprises**: shape bursts on every right answer. Streaks of 3, 5, 7 and 10 trigger swirls, ripples, falling puzzle blocks and a Bridget Riley-style dot wave. End-of-round celebrations get bigger for a top-3 finish or a new high score.
- **Puzzle collection**: every round wins a jigsaw piece of a generated op-art picture. A perfect round or a new high score wins extra pieces. Finished puzzles go into a gallery.
- **Grown-ups**:
  - sound on/off
  - questions per round (5, 10, 15 or 20)
  - managing players
  - a 12 × 12 progress grid that shows which facts each child knows
  - a list of the trickiest facts, which the game asks more often

Scores are saved in the browser on each device. Two devices won't share scores.

## Playing it

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser, or serve the folder:

```sh
npx http-server -p 8080
```

### Put it online for free (GitHub Pages)

1. On GitHub, go to **Settings → Pages**.
2. Choose **Deploy from a branch**, pick the branch and the `/ (root)` folder, then save.
3. Open the URL it gives you on the phone or iPad. Use **Share → Add to Home Screen** and it opens full screen like an app.

## Tests

```sh
node --test tests/*.test.js
```

## Files

- `index.html`: the screens
- `css/styles.css`: the look
- `js/game.js`: game rules (question picking, scoring, ranking), unit tested
- `js/app.js`: screens and the round loop
- `js/effects.js`: canvas celebrations
- `js/puzzle.js`: jigsaw puzzles and their op-art designs
- `js/sound.js`: synthesised sounds
- `js/storage.js`: saving to the browser
