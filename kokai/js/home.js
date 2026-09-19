// The home screen, where a flashcard round or quiz is started.

import { ALL_CATEGORIES, ConsonantClass, LetterCategory, LetterSelection, QuizDirection } from './data.js';
import { h, icon } from './dom.js';
import { button, showDialog, showMenu, usesLatinMarks } from './components.js';
import { strings } from './strings.js';

const CARD_PATH = 'M40,29h28a6,6 0,0 1,6 6v38a6,6 0,0 1,-6 6h-28a6,6 0,0 1,-6 -6v-38a6,6 0,0 1,6 -6z';
const GLYPH_PATH = 'M43.71 67V58.71Q43.71 56.44 44.78 55.05Q45.85 53.66 48.22 52.88V52.7L42.48 50.84V50.2Q42.48 47.37 43.91 45.33Q45.35 43.28 47.97 42.14Q50.58 41 54.09 41Q59.87 41 62.7 43.5Q65.52 46.01 65.52 51.11V67H59.78V51.2Q59.78 48.24 58.35 46.81Q56.91 45.37 53.95 45.37Q51.13 45.37 49.54 46.67Q47.94 47.97 47.94 50.24V51.06L45.67 48.19L53.54 51.29L53.23 54.2Q51.13 54.57 50.29 55.53Q49.45 56.48 49.45 58.49V67Z';

// The layers of the launcher icon span 108 units, of which launchers show the middle 72.
const LOGO_SVG = `<svg viewBox="18 18 72 72" aria-hidden="true">
  <rect width="108" height="108" fill="#34469d"/>
  <path transform="rotate(-12 54 54)" fill="#f6be48" d="${CARD_PATH}"/>
  <g transform="rotate(4 54 54)"><path fill="#ffffff" d="${CARD_PATH}"/><path fill="#34469d" d="${GLYPH_PATH}"/></g>
</svg>`;

/**
 * Creates the home screen. `uiState` holds whether the filter is open and the scroll position,
 * which are kept while a round is open.
 */
export function createHome(ctx, uiState) {
  const { settings, sessions } = ctx;

  // Starting a practice round needs at least one letter.
  const startIfPossible = (start) => {
    if (!ctx.letters.some((letter) => settings.letterSelection.has(letter.symbol))) showNothingSelectedDialog();
    else start();
  };

  const filter = letterFilter(ctx, uiState);

  const flashcards = modeCard({
    iconName: 'style',
    title: strings.homeFlashcardsTitle,
    description: strings.homeFlashcardsDescription,
    onStartInOrder: () => startIfPossible(() => ctx.openFlashcards({ shuffle: false, resume: false })),
    onStartShuffled: () => startIfPossible(() => ctx.openFlashcards({ shuffle: true, resume: false })),
    onResume: sessions.flashcards && (() => ctx.openFlashcards({ shuffle: sessions.flashcards.isShuffled, resume: true })),
    extraContent: transliterationSwitch(settings),
  });

  const quiz = modeCard({
    iconName: 'quiz',
    title: strings.homeQuizTitle,
    description: strings.homeQuizDescription,
    onStartInOrder: () =>
      startIfPossible(() => ctx.openQuiz({ shuffle: false, direction: settings.quizDirection, resume: false })),
    onStartShuffled: () =>
      startIfPossible(() => ctx.openQuiz({ shuffle: true, direction: settings.quizDirection, resume: false })),
    onResume: sessions.quiz &&
      (() => ctx.openQuiz({ shuffle: sessions.quiz.isShuffled, direction: sessions.quiz.direction, resume: true })),
    extraContent: quizDirectionSelector(settings),
  });

  const content = h(
    'main',
    { class: 'home-content' },
    h('div', { class: 'logo' }),
    h('h1', { class: 'home-title headline-medium semibold' }, strings.homeTitle),
    filter.el,
    h('div', { class: 'mode-cards' }, flashcards, quiz),
  );
  content.querySelector('.logo').innerHTML = LOGO_SVG;
  const el = h('div', { class: 'screen home' }, content);
  el.addEventListener('scroll', () => (uiState.scrollTop = el.scrollTop), { passive: true });

  function showNothingSelectedDialog() {
    showDialog({
      iconName: 'errorOutline',
      title: strings.nothingSelectedTitle,
      text: strings.nothingSelectedMessage,
      confirm: {
        text: strings.nothingSelectedChoose,
        onClick: () => {
          filter.setExpanded(true);
          el.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
      dismiss: { text: strings.cancel, onClick: () => {} },
    });
  }

  return {
    el,
    onMount() {
      el.scrollTop = uiState.scrollTop ?? 0;
    },
    dispose() {},
  };
}

function modeCard({ iconName, title, description, onStartInOrder, onStartShuffled, onResume, extraContent }) {
  let buttons;
  if (onResume) {
    const newRound = button({
      variant: 'tonal',
      size: 'tall',
      text: strings.newRound,
      trailingIcon: 'arrowDropDown',
      onClick: () =>
        showMenu(newRound, [
          { icon: 'playArrow', text: strings.startInOrder, onClick: onStartInOrder },
          { icon: 'shuffle', text: strings.startShuffled, onClick: onStartShuffled },
        ]),
    });
    newRound.setAttribute('aria-haspopup', 'menu');
    buttons = [
      button({ variant: 'filled', size: 'tall', text: strings.resume, leadingIcon: 'playArrow', onClick: onResume, className: 'grow' }),
      newRound,
    ];
  } else {
    buttons = [
      button({ variant: 'filled', size: 'tall', text: strings.startInOrder, leadingIcon: 'playArrow', onClick: onStartInOrder, className: 'grow' }),
      button({ variant: 'tonal', size: 'tall', text: strings.startShuffled, leadingIcon: 'shuffle', onClick: onStartShuffled, className: 'grow' }),
    ];
  }
  return h(
    'section',
    { class: 'mode-card elevated-card' },
    h(
      'div',
      {},
      h(
        'div',
        { class: 'mode-card-heading' },
        h('div', { class: 'mode-icon' }, icon(iconName)),
        h('h2', { class: 'title-large semibold' }, title),
      ),
      h('p', { class: 'mode-card-description body-medium' }, description),
      extraContent,
    ),
    h('div', { class: 'mode-buttons' }, buttons),
  );
}

function transliterationSwitch(settings) {
  const track = h('span', { class: 'switch' });
  const row = h(
    'button',
    { type: 'button', class: 'switch-row ripple', role: 'switch' },
    h('span', { class: 'text body-large' }, strings.showTransliteration),
    track,
  );
  const update = () => {
    track.classList.toggle('checked', settings.showTransliteration);
    row.setAttribute('aria-checked', String(settings.showTransliteration));
  };
  row.addEventListener('click', () => {
    settings.setShowTransliteration(!settings.showTransliteration);
    update();
  });
  update();
  return row;
}

function quizDirectionSelector(settings) {
  const segments = Object.values(QuizDirection).map((direction) => {
    const segment = h(
      'button',
      { type: 'button', class: 'segment ripple label-large', role: 'radio' },
      strings.quizDirection[direction],
    );
    segment.addEventListener('click', () => {
      settings.setQuizDirection(direction);
      update();
    });
    return { direction, segment };
  });
  const update = () => {
    for (const { direction, segment } of segments) {
      const isSelected = direction === settings.quizDirection;
      segment.classList.toggle('selected', isSelected);
      segment.setAttribute('aria-checked', String(isSelected));
    }
  };
  update();
  return h('div', { class: 'segmented', role: 'radiogroup' }, segments.map(({ segment }) => segment));
}

/**
 * A card that opens to choose which letters are practised, either by kind of letter or by picking
 * them one by one.
 */
function letterFilter(ctx, uiState) {
  const { letters, settings } = ctx;

  const leadingIcon = h('span', {});
  const summary = h('p', { class: 'summary body-medium' });
  const header = h(
    'button',
    { type: 'button', class: 'filter-header ripple' },
    leadingIcon,
    h('span', { class: 'text' }, h('p', { class: 'title-medium semibold' }, strings.filterHeading), summary),
    icon('expandMore', 'chevron'),
  );

  const segments = [false, true].map((showPicker) => {
    const segment = h(
      'button',
      { type: 'button', class: 'segment ripple label-large', role: 'radio' },
      showPicker ? strings.filterModePick : strings.filterModeCategories,
    );
    segment.addEventListener('click', () => {
      settings.setShowLetterPicker(showPicker);
      update();
    });
    return { showPicker, segment };
  });
  const modeSelector = h('div', { class: 'segmented', role: 'radiogroup' }, segments.map(({ segment }) => segment));

  const options = ALL_CATEGORIES.map((category) => {
    const option = h(
      'button',
      { type: 'button', class: 'filter-option ripple', role: 'checkbox' },
      h(
        'span',
        { class: 'checkbox' },
        h('span', {}),
      ),
      h('span', { class: 'name title-medium' }, strings.filterCategory[category]),
      h('span', { class: 'count title-medium' }),
    );
    option.querySelector('.checkbox span').innerHTML =
      '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.2l3.6 3.6L14.5 5.4"/></svg>';
    option.addEventListener('click', () => {
      const { letterSelection, includeRareLetters } = settings;
      const isSelected = LetterSelection.isSelected(letterSelection, category, letters, includeRareLetters);
      settings.setLetterSelection(
        LetterSelection.withCategory(letterSelection, category, !isSelected, letters, includeRareLetters),
      );
      update();
    });
    return { category, option };
  });

  const rareSwitch = h('span', { class: 'switch' });
  const rareOption = h(
    'button',
    { type: 'button', class: 'filter-option rare-option ripple', role: 'switch' },
    icon('historyEdu'),
    h(
      'span',
      { class: 'name' },
      h('span', { class: 'title-medium' }, strings.filterIncludeRare),
      h(
        'span',
        { class: 'rare-letters body-medium thai', lang: 'th' },
        letters.filter((letter) => letter.isRare).map((letter) => letter.symbol).join(' '),
      ),
    ),
    rareSwitch,
  );
  rareOption.addEventListener('click', () => {
    const include = !settings.includeRareLetters;
    settings.setIncludeRareLetters(include);
    settings.setLetterSelection(LetterSelection.withRareLetters(settings.letterSelection, include, letters));
    update();
  });

  const categoryOptions = h('div', { class: 'filter-options' }, options.map(({ option }) => option), rareOption);
  const picker = letterPicker(letters, settings, () => update());

  const body = h(
    'div',
    { class: 'filter-body' },
    h('div', {}, h('div', { class: 'filter-content' }, modeSelector, categoryOptions, picker.el)),
  );
  const el = h('section', { class: 'filter-card elevated-card' }, header, body);

  function update() {
    const { letterSelection, includeRareLetters, showLetterPicker } = settings;
    const selectedCount = letters.filter((letter) => letterSelection.has(letter.symbol)).length;
    leadingIcon.replaceChildren(
      selectedCount === 0 ? icon('errorOutline', 'filter-icon error') : icon('filterList', 'filter-icon'),
    );
    summary.textContent = selectedCount === 0
      ? strings.filterSummaryNone
      : selectedCount === letters.length
        ? strings.filterSummaryAll(letters.length)
        : strings.filterSummary(selectedCount, letters.length);
    summary.classList.toggle('error', selectedCount === 0);

    for (const { showPicker, segment } of segments) {
      segment.classList.toggle('selected', showPicker === showLetterPicker);
      segment.setAttribute('aria-checked', String(showPicker === showLetterPicker));
    }
    categoryOptions.hidden = showLetterPicker;
    picker.el.hidden = !showLetterPicker;

    // The counts leave out rare letters when those are excluded, since selecting a kind then doesn't pick them.
    const selectable = letters.filter((letter) => includeRareLetters || !letter.isRare);
    for (const { category, option } of options) {
      const isSelected = LetterSelection.isSelected(letterSelection, category, letters, includeRareLetters);
      option.classList.toggle('selected', isSelected);
      option.setAttribute('aria-checked', String(isSelected));
      option.querySelector('.count').textContent = selectable.filter((letter) => letter.category === category).length;
    }
    rareOption.classList.toggle('selected', includeRareLetters);
    rareOption.setAttribute('aria-checked', String(includeRareLetters));
    rareSwitch.classList.toggle('checked', includeRareLetters);
    picker.update();
  }

  function setExpanded(expanded) {
    uiState.filterExpanded = expanded;
    el.classList.toggle('expanded', expanded);
    header.setAttribute('aria-expanded', String(expanded));
    header.title = expanded ? strings.filterCollapse : strings.filterExpand;
    body.inert = !expanded;
  }

  header.addEventListener('click', () => setExpanded(!uiState.filterExpanded));
  update();
  setExpanded(Boolean(uiState.filterExpanded));
  return { el, setExpanded };
}

/**
 * The letters grouped by kind, to pick one by one. Each group can be picked or cleared at once, and
 * the consonants also per class. `onChange` is called after every change to the picked letters.
 */
function letterPicker(letters, settings, onChange) {
  // Adds the symbols when not all of them are picked yet, and otherwise removes them.
  const toggleAll = (symbols) => {
    const selection = new Set(settings.letterSelection);
    const isAllPicked = symbols.every((symbol) => selection.has(symbol));
    for (const symbol of symbols) {
      if (isAllPicked) selection.delete(symbol);
      else selection.add(symbol);
    }
    settings.setLetterSelection(selection);
    onChange();
  };

  const groups = ALL_CATEGORIES.map((category) => {
    const group = letters.filter((letter) => letter.category === category);
    const symbols = group.map((letter) => letter.symbol);
    const count = h('p', { class: 'picked-count body-medium' });
    const allButton = button({ variant: 'text', text: '', onClick: () => toggleAll(symbols) });

    const chips = category !== LetterCategory.Consonant ? [] : Object.values(ConsonantClass).map((consonantClass) => {
      const classSymbols = group.filter((letter) => letter.consonantClass === consonantClass).map((letter) => letter.symbol);
      const chip = h(
        'button',
        { type: 'button', class: 'filter-chip ripple label-large', 'aria-pressed': 'false' },
        strings.filterClass[consonantClass],
      );
      chip.addEventListener('click', () => toggleAll(classSymbols));
      return { chip, classSymbols };
    });

    const tiles = group.map((letter) => {
      const symbol = letterTileSymbol(letter.symbol);
      const tile = h(
        'button',
        { type: 'button', class: 'letter-tile ripple', role: 'checkbox', 'aria-label': letter.transliteration },
        symbol.el,
      );
      tile.addEventListener('click', () => {
        const selection = new Set(settings.letterSelection);
        if (selection.has(letter.symbol)) selection.delete(letter.symbol);
        else selection.add(letter.symbol);
        settings.setLetterSelection(selection);
        onChange();
      });
      return { letter, tile, symbol };
    });

    const el = h(
      'div',
      { class: 'picker-group' },
      h(
        'div',
        { class: 'picker-group-header' },
        h('div', { class: 'text' }, h('p', { class: 'title-medium' }, strings.filterCategory[category]), count),
        allButton,
      ),
      chips.length > 0 && h('div', { class: 'class-chips' }, chips.map(({ chip }) => chip)),
      h('div', { class: 'letter-tiles' }, tiles.map(({ tile }) => tile)),
    );

    const update = () => {
      const selection = settings.letterSelection;
      const pickedCount = symbols.filter((symbol) => selection.has(symbol)).length;
      count.textContent = strings.filterPickedCount(pickedCount, symbols.length);
      allButton.querySelector('.label').textContent =
        pickedCount === symbols.length ? strings.filterPickNone : strings.filterPickAll;
      for (const { chip, classSymbols } of chips) {
        const isAllPicked = classSymbols.every((symbol) => selection.has(symbol));
        chip.classList.toggle('selected', isAllPicked);
        chip.setAttribute('aria-pressed', String(isAllPicked));
      }
      for (const { letter, tile } of tiles) {
        const isPicked = selection.has(letter.symbol);
        tile.classList.toggle('picked', isPicked);
        tile.setAttribute('aria-checked', String(isPicked));
      }
    };
    return { el, update, tiles };
  });

  // The symbols can only be centred once their fonts are loaded and can be measured.
  const allTiles = groups.flatMap((group) => group.tiles);
  Promise.all(TILE_FONTS.map((font) => document.fonts.load(`${TILE_FONT_SIZE}px ${font}`)))
    .then(() => allTiles.forEach(({ symbol }) => symbol.centre()))
    .catch(() => {});

  return {
    el: h('div', { class: 'letter-picker' }, groups.map((group) => group.el)),
    update: () => groups.forEach((group) => group.update()),
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const TILE_SIZE = 48;
const TILE_FONT_SIZE = 22;
const TILE_FONTS = ['"Thai Looped"', '"Latin Marks"'];
let measuringContext = null;

/**
 * The symbol of a letter tile, drawn in an SVG so it can be placed by its outline. Text is laid out
 * in lines with room for marks above and below letters, so a symbol centred by its line sits
 * off-centre. `centre` moves the middle of the drawn outline to the middle of the tile instead.
 */
function letterTileSymbol(symbol) {
  const font = usesLatinMarks(symbol) ? TILE_FONTS[1] : TILE_FONTS[0];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${TILE_SIZE} ${TILE_SIZE}`);
  svg.setAttribute('aria-hidden', 'true');
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('font-size', String(TILE_FONT_SIZE));
  text.style.fontFamily = font;
  text.setAttribute('lang', 'th');
  // Until the outline is measured, the symbol is centred by its line.
  text.setAttribute('x', String(TILE_SIZE / 2));
  text.setAttribute('y', String(TILE_SIZE / 2));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.textContent = symbol;
  svg.append(text);

  const centre = () => {
    measuringContext ??= document.createElement('canvas').getContext('2d');
    measuringContext.font = `${TILE_FONT_SIZE}px ${font}`;
    const ink = measuringContext.measureText(symbol);
    // Measured from the start of the text on its baseline, with the left and top edges as positive distances.
    const inkCentreX = (ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2;
    const inkCentreY = (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / 2;
    text.removeAttribute('text-anchor');
    text.removeAttribute('dominant-baseline');
    text.setAttribute('x', String(TILE_SIZE / 2 - inkCentreX));
    text.setAttribute('y', String(TILE_SIZE / 2 - inkCentreY));
  };
  return { el: svg, centre };
}
