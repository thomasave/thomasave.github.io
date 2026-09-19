// Settings and unfinished rounds, kept in local storage so they persist between visits.

import { ALL_CATEGORIES, LetterSelection, QuizDirection, QuizSession } from './data.js';

const KEY_SETTINGS = 'kokai.settings';
const KEY_FLASHCARDS = 'kokai.flashcards';
const KEY_QUIZ = 'kokai.quiz';
const KEY_LETTERS_FINGERPRINT = 'kokai.lettersFingerprint';

function read(key) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage, such as in some private browsing modes, the app still works for this visit.
  }
}

/** User preferences that persist between visits. */
export class Settings {
  constructor(letters) {
    const stored = read(KEY_SETTINGS) ?? {};
    this.showTransliteration = stored.showTransliteration ?? true;
    /** Whether selecting a category also picks its letters that are obsolete or rarely used. */
    this.includeRareLetters = stored.includeRareLetters ?? true;
    /** The symbols of the letters included in flashcards and quizzes. */
    this.letterSelection = Array.isArray(stored.pickedLetters)
      ? new Set(stored.pickedLetters)
      // Otherwise the selection starts from the stored categories, or from all of them.
      : LetterSelection.of(
        new Set(Array.isArray(stored.practiceCategories) ? stored.practiceCategories : ALL_CATEGORIES),
        letters,
        this.includeRareLetters,
      );
    /** Whether letters are chosen one by one rather than by category. */
    this.showLetterPicker = stored.showLetterPicker ?? false;
    this.quizDirection = Object.values(QuizDirection).includes(stored.quizDirection)
      ? stored.quizDirection
      : QuizDirection.LetterToName;
  }

  setShowTransliteration(show) {
    this.showTransliteration = show;
    this.#save();
  }

  setLetterSelection(selection) {
    this.letterSelection = new Set(selection);
    this.#save();
  }

  setShowLetterPicker(show) {
    this.showLetterPicker = show;
    this.#save();
  }

  setIncludeRareLetters(include) {
    this.includeRareLetters = include;
    this.#save();
  }

  setQuizDirection(direction) {
    this.quizDirection = direction;
    this.#save();
  }

  #save() {
    write(KEY_SETTINGS, {
      showTransliteration: this.showTransliteration,
      includeRareLetters: this.includeRareLetters,
      pickedLetters: [...this.letterSelection],
      showLetterPicker: this.showLetterPicker,
      quizDirection: this.quizDirection,
    });
  }
}

/**
 * Remembers the last unfinished flashcard round and quiz, so they can be resumed later. A saved
 * flashcard round is `{ order, page, isShuffled }` and a saved quiz `{ session, direction, isShuffled }`.
 */
export class SessionStore {
  constructor(letters) {
    // Saved rounds refer to letters by their position, so they're dropped once the list of letters
    // changes, for example after an update adds new ones.
    const fingerprint = hash(letters.map((letter) => letter.symbol).join('\n'));
    if (read(KEY_LETTERS_FINGERPRINT) !== fingerprint) {
      write(KEY_FLASHCARDS, null);
      write(KEY_QUIZ, null);
      write(KEY_LETTERS_FINGERPRINT, fingerprint);
    }
    this.flashcards = read(KEY_FLASHCARDS);
    this.quiz = read(KEY_QUIZ);
  }

  /** Saves the flashcard round, or forgets it while it's still on its first card. */
  saveFlashcards(flashcards) {
    this.flashcards = flashcards.page > 0 ? flashcards : null;
    write(KEY_FLASHCARDS, this.flashcards);
  }

  clearFlashcards() {
    this.flashcards = null;
    write(KEY_FLASHCARDS, null);
  }

  /** Saves the quiz, or forgets it when it's finished or nothing was answered yet. */
  saveQuiz(quiz) {
    const { session } = quiz;
    const hasProgress = !QuizSession.isFinished(session) && (session.answered > 0 || session.isRevealed);
    this.quiz = hasProgress ? quiz : null;
    write(KEY_QUIZ, this.quiz);
  }
}

function hash(text) {
  let result = 0;
  for (let i = 0; i < text.length; i++) result = (Math.imul(31, result) + text.charCodeAt(i)) | 0;
  return result;
}
