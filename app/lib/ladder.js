/*
 * Port of Doremimi.Core/Learning/LevelLadder.cs (dossier ch. 10, P-06), numbers from Doremimi.Core/Config/learning.json.
 * The meter shows the run toward the next step up and never the struggles: the owner's "never shame".
 */
export const Level = Object.freeze({ Cevir: 0, Sec: 1, Yaz: 2 });
export const Move = Object.freeze({ None: 'None', Up: 'Up', Down: 'Down' });
export const Signal = Object.freeze({ Struggle: 'Struggle', Neutral: 'Neutral', Right: 'Right' });

export class LevelLadder {
  constructor(config, start = Level.Yaz) {
    this.config = config;
    this.level = start;
    this.rightInARow = 0;
    this.strugglesInARow = 0;
  }

  get rightNeeded() {
    return this.level === Level.Sec ? this.config.upFromSecAfterRight : this.level === Level.Cevir ? this.config.upFromCevirAfterBildim : 0;
  }

  record(signal) {
    switch (signal) {
      case Signal.Struggle:
        this.rightInARow = 0;
        if (++this.strugglesInARow >= this.config.downAfterStruggles && this.level > Level.Cevir) return this.#move(this.level - 1, Move.Down);
        return Move.None;
      case Signal.Right:
        this.strugglesInARow = 0;
        if (this.rightNeeded === 0) return Move.None;
        if (++this.rightInARow >= this.rightNeeded) return this.#move(this.level + 1, Move.Up);
        return Move.None;
      case Signal.Neutral:
        this.strugglesInARow = 0;
        return Move.None;
      default:
        throw new RangeError(`Unknown signal ${signal}`);
    }
  }

  #move(to, move) { this.level = to; this.rightInARow = 0; this.strugglesInARow = 0; return move; }
}
