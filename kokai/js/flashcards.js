// The flashcards screen, which swipes through the letters one card at a time.

import { deckOrder } from './data.js';
import { h, icon } from './dom.js';
import {
  button,
  iconButton,
  letterAnswer,
  letterCard,
  linearProgress,
  pronounceButton,
  setClickable,
  topAppBar,
} from './components.js';
import { strings } from './strings.js';

const PAGE_SPACING = 16;

/**
 * Creates the flashcards screen for `args` of `{ shuffle, resume }`. The `saved` state of an
 * earlier visit to this screen, such as before reloading the page, takes precedence.
 */
export function createFlashcards(ctx, args, saved) {
  const { letters, settings, sessions, audio } = ctx;
  const isShuffled = args.shuffle;

  // The saved round this screen continues, when it was opened to resume one.
  const resumed = args.resume ? sessions.flashcards : null;
  const order = saved?.order ?? resumed?.order ?? deckOrder(letters, settings.letterSelection, isShuffled);
  const cards = order.map((index) => letters[index]);
  let currentPage = Math.min(saved?.page ?? resumed?.page ?? 0, cards.length - 1);

  const toggle = iconButton({ iconName: 'visibility', label: '', onClick: () => setShowTransliteration(!settings.showTransliteration) });
  const progress = linearProgress();
  const position = h('span', { class: 'position label-large' });
  const pages = cards.map((letter) => flashcard(letter, audio));
  const pager = h('div', { class: 'pager' }, pages.map((page) => h('div', { class: 'page' }, page.el)));
  const previous = button({
    variant: 'outlined',
    size: 'tall',
    text: strings.previous,
    leadingIcon: 'arrowBack',
    onClick: () => scrollToPage(currentPage - 1),
  });
  const next = button({ variant: 'filled', size: 'tall', text: strings.next, trailingIcon: 'arrowForward', onClick: onNext });

  const el = h(
    'div',
    { class: 'screen' },
    topAppBar({ title: isShuffled ? strings.flashcardsTitleShuffled : strings.flashcardsTitle, onBack: ctx.back, actions: [toggle] }),
    h(
      'div',
      { class: 'screen-content' },
      h(
        'div',
        { class: 'deck' },
        h(
          'div',
          { class: 'deck-layout' },
          h('div', { class: 'deck-progress' }, progress.el, position),
          pager,
          h('div', { class: 'deck-navigation' }, previous, next),
        ),
      ),
    ),
  );

  function setShowTransliteration(show) {
    settings.setShowTransliteration(show);
    toggle.classList.toggle('checked', show);
    toggle.replaceChildren(icon(show ? 'visibility' : 'visibilityOff'));
    const label = show ? strings.hideTransliterationAction : strings.showTransliterationAction;
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    // With transliterations hidden, tapping a card reveals it for that card only.
    pages.forEach((page) => page.setShowTransliteration(show));
  }

  function pageWidth() {
    return pager.clientWidth - 64 + PAGE_SPACING;
  }

  function scrollToPage(page, behavior = 'smooth') {
    pager.scrollTo({ left: page * pageWidth(), behavior });
  }

  function onNext() {
    if (currentPage === cards.length - 1) {
      sessions.clearFlashcards();
      ctx.back();
    } else {
      scrollToPage(currentPage + 1);
    }
  }

  function showPage(page) {
    currentPage = page;
    progress.set((page + 1) / cards.length);
    position.textContent = strings.flashcardsPosition(page + 1, cards.length);
    previous.disabled = page === 0;
    const isLast = page === cards.length - 1;
    next.querySelector('.label').textContent = isLast ? strings.done : strings.next;
    next.querySelector('svg.icon').replaceWith(icon(isLast ? 'check' : 'arrowForward'));
    // A recording that's still playing shouldn't carry over to the next card.
    audio.stop();
    // Remembers the current card, so the round can be resumed from there.
    sessions.saveFlashcards({ order, page, isShuffled });
    ctx.saveScreenState({ order, page });
  }

  pager.addEventListener(
    'scroll',
    () => {
      const page = Math.max(0, Math.min(cards.length - 1, Math.round(pager.scrollLeft / pageWidth())));
      if (page !== currentPage) showPage(page);
    },
    { passive: true },
  );

  // Keeps the current card in view when the screen is resized or rotated.
  const resizeObserver = new ResizeObserver(() => scrollToPage(currentPage, 'instant'));

  setShowTransliteration(settings.showTransliteration);

  return {
    el,
    onMount() {
      scrollToPage(currentPage, 'instant');
      showPage(currentPage);
      resizeObserver.observe(pager);
    },
    dispose() {
      resizeObserver.disconnect();
      audio.stop();
    },
  };
}

function flashcard(letter, audio) {
  let revealed = false;
  let showTransliteration = true;
  const answer = letterAnswer(letter, { isVisible: true, placeholder: strings.tapToReveal });
  const card = letterCard(letter, {
    details: answer.el,
    action: letter.audioFile && pronounceButton(audio, letter),
  });
  // The listen button shouldn't also reveal or hide the answer.
  card.el.querySelector('.pronounce-button')?.addEventListener('click', (event) => event.stopPropagation());

  const update = () => {
    answer.setVisible(showTransliteration || revealed);
    setClickable(card.el, showTransliteration ? null : () => {
      revealed = !revealed;
      update();
    });
  };

  return {
    el: card.el,
    setShowTransliteration(show) {
      showTransliteration = show;
      revealed = false;
      update();
    },
  };
}
