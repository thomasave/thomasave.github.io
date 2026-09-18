// Plays the pronunciation recordings, one at a time.

export class AudioPlayer {
  #audio = null;
  #listeners = new Set();

  /** The recording that is currently playing, or null when silent. */
  playingFile = null;

  /** Calls `listener` whenever the playing recording changes, and returns a function to stop that. */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  play(fileName) {
    this.stop();
    const audio = new Audio(`audio/${encodeURIComponent(fileName)}`);
    audio.addEventListener('ended', () => this.#finish(audio));
    audio.addEventListener('error', () => this.#finish(audio));
    this.#audio = audio;
    this.#setPlaying(fileName);
    audio.play().catch(() => this.#finish(audio));
  }

  stop() {
    if (this.#audio) {
      this.#audio.pause();
      this.#audio.removeAttribute('src');
      this.#audio = null;
    }
    this.#setPlaying(null);
  }

  #finish(audio) {
    if (this.#audio === audio) this.stop();
  }

  #setPlaying(fileName) {
    if (this.playingFile === fileName) return;
    this.playingFile = fileName;
    this.#listeners.forEach((listener) => listener(fileName));
  }
}
