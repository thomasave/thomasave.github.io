// The home screen, where a flashcard round or quiz is started.

import { ALL_CATEGORIES, QuizDirection } from './data.js';
import { h, icon } from './dom.js';
import { button, showDialog, showMenu } from './components.js';
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

  // Starting a practice round needs at least one kind of letter.
  const startIfPossible = (start) => {
    if (settings.practiceCategories.size === 0) showNothingSelectedDialog();
    else start();
  };

  const filter = categoryFilter(ctx, uiState);

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

/** A card that opens to choose which kinds of letters are practised. */
function categoryFilter(ctx, uiState) {
  const { letters, settings } = ctx;
  const countIn = (category) => letters.filter((letter) => letter.category === category).length;

  const leadingIcon = h('span', {});
  const summary = h('p', { class: 'summary body-medium' });
  const header = h(
    'button',
    { type: 'button', class: 'filter-header ripple' },
    leadingIcon,
    h('span', { class: 'text' }, h('p', { class: 'title-medium semibold' }, strings.filterHeading), summary),
    icon('expandMore', 'chevron'),
  );

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
      h('span', { class: 'count title-medium' }, countIn(category)),
    );
    option.querySelector('.checkbox span').innerHTML =
      '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.2l3.6 3.6L14.5 5.4"/></svg>';
    option.addEventListener('click', () => {
      const selected = new Set(settings.practiceCategories);
      if (selected.has(category)) selected.delete(category);
      else selected.add(category);
      settings.setPracticeCategories(ALL_CATEGORIES.filter((c) => selected.has(c)));
      update();
    });
    return { category, option };
  });

  const body = h(
    'div',
    { class: 'filter-body' },
    h('div', {}, h('div', { class: 'filter-options' }, options.map(({ option }) => option))),
  );
  const el = h('section', { class: 'filter-card elevated-card' }, header, body);

  function update() {
    const selected = settings.practiceCategories;
    const selectedCount = letters.filter((letter) => selected.has(letter.category)).length;
    leadingIcon.replaceChildren(
      selected.size === 0 ? icon('errorOutline', 'filter-icon error') : icon('filterList', 'filter-icon'),
    );
    summary.textContent = selectedCount === 0
      ? strings.filterSummaryNone
      : selectedCount === letters.length
        ? strings.filterSummaryAll(letters.length)
        : strings.filterSummary(selectedCount, letters.length);
    summary.classList.toggle('error', selectedCount === 0);
    for (const { category, option } of options) {
      const isSelected = selected.has(category);
      option.classList.toggle('selected', isSelected);
      option.setAttribute('aria-checked', String(isSelected));
    }
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
