// The letters, quiz rounds and deck orders, mirroring the data layer of the Android app.

export const LetterCategory = Object.freeze({
  Consonant: 'Consonant',
  Vowel: 'Vowel',
  ToneMark: 'ToneMark',
  Sign: 'Sign',
  Number: 'Number',
});

export const ALL_CATEGORIES = Object.values(LetterCategory);

/** The class of a consonant, which together with any tone mark determines a syllable's tone. */
export const ConsonantClass = Object.freeze({ Low: 'Low', Mid: 'Mid', High: 'High' });

export const QuizDirection = Object.freeze({
  /** Shows a letter and asks for its name. */
  LetterToName: 'LetterToName',
  /** Shows a name and asks to pick the matching letter. */
  NameToLetter: 'NameToLetter',
});

const DOTTED_CIRCLE = '◌';

const CATEGORIES_BY_NAME = {
  consonant: LetterCategory.Consonant,
  vowel: LetterCategory.Vowel,
  'tone mark': LetterCategory.ToneMark,
  sign: LetterCategory.Sign,
  number: LetterCategory.Number,
};

const CLASSES_BY_NAME = { low: ConsonantClass.Low, mid: ConsonantClass.Mid, high: ConsonantClass.High };

/**
 * Returns the letters in the order of `lettersCsv`. Letters whose code point appears in
 * `audioIndexCsv` get the matching recording.
 */
export function parseLetters(lettersCsv, audioIndexCsv) {
  const audioFiles = new Map(records(audioIndexCsv).map((record) => [record.code_point, record.file]));
  return records(lettersCsv).map((record) => {
    const category = CATEGORIES_BY_NAME[record.category];
    if (category === undefined) throw new Error(`Unknown category: ${record.category}`);
    const consonantClass = record.class === '' ? null : CLASSES_BY_NAME[record.class];
    if (consonantClass === undefined) throw new Error(`Unknown consonant class: ${record.class}`);
    if (record.rare !== '' && record.rare !== 'yes') throw new Error(`Unknown value for rare: ${record.rare}`);
    return Object.freeze({
      symbol: displaySymbol(record.code_point),
      transliteration: record.transliteration,
      thaiName: record.thai_name,
      meaning: record.meaning === '' ? null : record.meaning,
      category,
      consonantClass,
      audioFile: audioFiles.get(record.code_point) ?? null,
      // Whether the letter is obsolete or mostly found in words from Sanskrit and Pali.
      isRare: record.rare === 'yes',
    });
  });
}

/** Returns the text to show for the character with the given `U+XXXX` code point. */
export function displaySymbol(codePoint) {
  const text = String.fromCodePoint(parseInt(codePoint.replace(/^U\+/, ''), 16));
  // Combining marks such as the vowel signs above and below a consonant can't be shown on their
  // own, so they are drawn on a dotted circle like in dictionaries and textbooks.
  return /^\p{Mn}$/u.test(text) ? DOTTED_CIRCLE + text : text;
}

/** Reads a CSV file with a header row into one object from column name to value per row. */
function records(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const header = lines[0].split(',').map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    if (values.length !== header.length) throw new Error(`Expected ${header.length} columns in: ${line}`);
    return Object.fromEntries(header.map((name, i) => [name, values[i]]));
  });
}

/** Returns a shuffled copy of `items`. */
export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The letters picked for practice, as a set of their symbols. Letters are picked one by one or a
 * whole category at a time, and a category counts as selected when exactly the letters that
 * selecting it picks are picked.
 */
export const LetterSelection = Object.freeze({
  /** The letters of the given `categories`, leaving out rare letters unless `includeRare` is set. */
  of(categories, letters, includeRare) {
    return categorySymbols(letters.filter((letter) => categories.has(letter.category)), includeRare);
  },

  /**
   * Whether the picked letters of `category` are exactly those that selecting it picks: all of
   * them, or all but the rare ones unless `includeRare` is set.
   */
  isSelected(selection, category, letters, includeRare) {
    const group = letters.filter((letter) => letter.category === category);
    return group.some((letter) => includeRare || !letter.isRare) &&
      group.every((letter) => selection.has(letter.symbol) === (includeRare || !letter.isRare));
  },

  /**
   * Picks the letters that selecting `category` picks when `selected` is set, replacing the letters
   * of that category picked before, and otherwise leaves out the whole category.
   */
  withCategory(selection, category, selected, letters, includeRare) {
    const group = letters.filter((letter) => letter.category === category);
    const result = new Set(selection);
    for (const letter of group) result.delete(letter.symbol);
    if (selected) for (const symbol of categorySymbols(group, includeRare)) result.add(symbol);
    return result;
  },

  /**
   * Adds or removes the rare letters of the categories that are selected, so they stay selected
   * once rare letters are included or left out. Other picked letters are kept as they are.
   */
  withRareLetters(selection, include, letters) {
    const selected = new Set(
      ALL_CATEGORIES.filter((category) => LetterSelection.isSelected(selection, category, letters, !include)),
    );
    const result = new Set(selection);
    for (const letter of letters) {
      if (!letter.isRare || !selected.has(letter.category)) continue;
      if (include) result.add(letter.symbol);
      else result.delete(letter.symbol);
    }
    return result;
  },
});

function categorySymbols(letters, includeRare) {
  return new Set(letters.filter((letter) => includeRare || !letter.isRare).map((letter) => letter.symbol));
}

/**
 * Returns the indices of the `letters` in the `selection`, in alphabetical order or in random order
 * when `shuffle` is set.
 */
export function deckOrder(letters, selection, shuffle) {
  const indices = letters.flatMap((letter, i) => (selection.has(letter.symbol) ? [i] : []));
  return shuffle ? shuffled(indices) : indices;
}

/**
 * Returns the indices of `count` different `letters` in random order: the `answer` and others to
 * choose from. The others come from the answer's category where possible, so a numeral is mixed
 * with numerals and a vowel with vowels. Rare letters are only among the others if `includeRare`
 * is set or the answer is rare itself, so a rare answer doesn't stand out.
 */
export function quizChoices(answer, letters, includeRare = true, count = 4, random = Math.random) {
  const allowRare = includeRare || letters[answer].isRare;
  const sameCategory = [];
  const otherCategories = [];
  letters.forEach((letter, i) => {
    if (i === answer || (!allowRare && letter.isRare)) return;
    (letter.category === letters[answer].category ? sameCategory : otherCategories).push(i);
  });
  const others = shuffled(sameCategory, random).slice(0, count - 1);
  const fillers = shuffled(otherCategories, random).slice(0, count - 1 - others.length);
  return shuffled([...others, ...fillers, answer], random);
}

/**
 * The progress through a quiz. Letters that are answered wrongly move to the back of the queue,
 * so the quiz only ends once every letter has been answered correctly. Sessions are plain objects
 * that are never modified, so they can be stored as JSON.
 *
 * - `queue`: indices of the letters that still need a correct answer, starting with the current one.
 * - `misses`: pairs of a letter and how often it was answered wrongly, in the order they were first missed.
 * - `answered`: number of answers given so far, which also identifies each question uniquely.
 * - `choices`: the letters to pick from when the current letter is chosen out of several options.
 * - `selected`: the option picked for the current letter, if any.
 */
export const QuizSession = {
  start(order) {
    return { queue: order, total: order.length, misses: [], isRevealed: false, answered: 0, choices: [], selected: null };
  },

  current: (session) => session.queue[0] ?? null,

  isFinished: (session) => session.queue.length === 0,

  /** Number of letters that have been answered correctly. */
  learned: (session) => session.total - session.queue.length,

  missCount: (session, letter) => session.misses.find(([index]) => index === letter)?.[1] ?? 0,

  /** Whether the current letter was answered wrongly before. */
  isRepeat: (session) => session.queue.length > 0 && QuizSession.missCount(session, session.queue[0]) > 0,

  /** Number of letters in the queue that are there to be tried again. */
  pendingRepeats: (session) => session.queue.filter((letter) => QuizSession.missCount(session, letter) > 0).length,

  firstTryCorrect: (session) => session.total - session.misses.length,

  /** Whether the picked option is the current letter. */
  isSelectionCorrect: (session) => session.selected !== null && session.selected === QuizSession.current(session),

  reveal: (session) => ({ ...session, isRevealed: true }),

  /** Picks one of the choices, which also reveals the answer. */
  select(session, choice) {
    if (session.isRevealed || QuizSession.isFinished(session)) return session;
    return { ...session, isRevealed: true, selected: choice };
  },

  withChoices: (session, choices) => ({ ...session, choices }),

  /** Moves on to the next letter, sending the current one to the back of the queue if `correct` is false. */
  answer(session, correct) {
    const letter = QuizSession.current(session);
    if (letter === null || !session.isRevealed) return session;
    const rest = session.queue.slice(1);
    const next = { ...session, isRevealed: false, answered: session.answered + 1, choices: [], selected: null };
    if (correct) return { ...next, queue: rest };
    const count = QuizSession.missCount(session, letter) + 1;
    const misses = count === 1
      ? [...session.misses, [letter, 1]]
      : session.misses.map(([index, n]) => [index, index === letter ? count : n]);
    return { ...next, queue: [...rest, letter], misses };
  },
};
