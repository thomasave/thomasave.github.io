// The quiz screen, which asks for the name of each letter or for the letter that matches a name.

import { deckOrder, QuizDirection, quizChoices, QuizSession } from './data.js';
import { h, icon } from './dom.js';
import {
  button,
  letterAnswer,
  letterCard,
  letterLabels,
  letterNameAndMeaning,
  linearProgress,
  pronounceButton,
  setClickable,
  topAppBar,
} from './components.js';
import { strings } from './strings.js';

/**
 * Creates the quiz screen for `args` of `{ shuffle, direction, resume }`. The `saved` state of an
 * earlier visit to this screen, such as before reloading the page, takes precedence.
 */
export function createQuiz(ctx, args, saved) {
  const { letters, settings, sessions, audio } = ctx;
  const isShuffled = args.shuffle;
  const direction = Object.values(QuizDirection).includes(args.direction) ? args.direction : QuizDirection.LetterToName;

  /** Adds options to pick from for the current letter when the quiz asks to find letters. */
  const withNewChoices = (session) => {
    const letter = QuizSession.current(session);
    return direction === QuizDirection.NameToLetter && letter !== null
      // The options are only letters of this quiz. Quizzes saved without their deck take them from
      // the letters that are left.
      ? QuizSession.withChoices(session, quizChoices(letter, letters, session.deck ?? session.queue))
      : session;
  };
  const newSession = () => {
    const order = deckOrder(letters, settings.letterSelection, isShuffled);
    return withNewChoices(QuizSession.start(order));
  };

  let session = saved?.session ?? (args.resume ? sessions.quiz?.session : null) ?? newSession();

  const content = h('div', { class: 'screen-content' });
  const el = h('div', { class: 'screen' }, topAppBar({ title: strings.quizTitle[direction], onBack: ctx.back }), content);

  const actions = {
    reveal: () => update(QuizSession.reveal(session)),
    /** Records whether the revealed letter was named correctly and moves on. */
    answer: (correct) => {
      audio.stop();
      update(QuizSession.answer(session, correct));
    },
    select: (choice) => update(QuizSession.select(session, choice)),
    /** Moves on after picking an option, counting it as right if the picked option is the current letter. */
    next: () => {
      audio.stop();
      update(withNewChoices(QuizSession.answer(session, QuizSession.isSelectionCorrect(session))));
    },
    restart: () => update(newSession()),
  };

  let view = null;

  function render() {
    if (QuizSession.isFinished(session)) {
      if (view?.kind !== 'results') {
        view = { kind: 'results', ...quizResults(session, letters, actions, ctx) };
        content.replaceChildren(view.el);
      }
    } else if (view?.kind !== 'question') {
      const create = direction === QuizDirection.LetterToName ? nameTheLetter : findTheLetter;
      view = { kind: 'question', ...create(session, letters, audio, actions) };
      content.replaceChildren(view.el);
    } else {
      view.update(session);
    }
  }

  function update(updated) {
    session = updated;
    save();
    render();
  }

  function save() {
    ctx.saveScreenState({ session });
    sessions.saveQuiz({ session, direction, isShuffled });
  }

  // A new quiz replaces the saved one, even before its first answer.
  save();
  render();

  return {
    el,
    onMount() {},
    dispose() {
      audio.stop();
    },
  };
}

/**
 * Arranges a quiz question with the progress on top, the card in the middle and the controls
 * below. On short, wide screens such as phones in landscape, the controls move next to the card.
 */
function quizLayout(session, cardSlot, controls) {
  const progress = quizProgress(session);
  const el = h(
    'div',
    { class: 'quiz-layout' },
    h(
      'div',
      { class: 'quiz-column' },
      progress.el,
      h('div', { class: 'quiz-card-area' }, cardSlot),
      h('div', { class: 'quiz-controls' }, controls),
    ),
  );
  return { el, updateProgress: progress.update };
}

function quizProgress(session) {
  const learned = h('span', { class: 'learned label-large' });
  const repeats = h('span', { class: 'repeats label-large' });
  const bar = linearProgress();
  const el = h('div', { class: 'quiz-progress' }, h('div', { class: 'quiz-progress-text' }, learned, repeats), bar.el);
  const update = (state) => {
    learned.textContent = strings.quizProgress(QuizSession.learned(state), state.total);
    const pending = QuizSession.pendingRepeats(state);
    repeats.textContent = pending > 0 ? strings.quizToRepeat(pending) : '';
    bar.set(QuizSession.learned(state) / state.total);
  };
  update(session);
  return { el, update };
}

/**
 * Shows the view for the current question, sliding a new one in whenever the question changes.
 * `create` builds a view with an `update` method for changes within the same question.
 */
function animatedQuestion(create, className = '') {
  const slot = h('div', { class: ['question-slot', className] });
  let current = null;
  let key = null;

  function show(session) {
    if (current && key === session.answered) {
      current.update(session);
      return;
    }
    const previous = current;
    key = session.answered;
    current = create(session);
    const wrapper = h('div', { class: 'question' }, current.el);
    if (previous) {
      wrapper.classList.add('entering');
      previous.wrapper.classList.add('leaving');
      previous.wrapper.inert = true;
      const outgoing = previous.wrapper;
      setTimeout(() => outgoing.remove(), 400);
      requestAnimationFrame(() => requestAnimationFrame(() => wrapper.classList.remove('entering')));
    }
    current.wrapper = wrapper;
    slot.append(wrapper);
  }

  return { el: slot, show };
}

/** Shows a letter and asks to reveal its name and say whether it was right. */
function nameTheLetter(session, letters, audio, actions) {
  const card = animatedQuestion((state) => quizCard(letters[QuizSession.current(state)], state, audio, actions));
  const controls = quizActions(actions);
  const layout = quizLayout(session, card.el, controls.el);

  const update = (state) => {
    layout.updateProgress(state);
    card.show(state);
    controls.update(state);
  };
  update(session);
  return { el: layout.el, update };
}

function quizCard(letter, session, audio, actions) {
  const answer = letterAnswer(letter, { isVisible: false, placeholder: strings.quizPrompt });
  // The pronunciation gives the answer away, so it's only offered after revealing. An empty space
  // of the same height keeps the card from shifting.
  const audioSlot = letter.audioFile ? h('div', { class: 'audio-spacer' }) : null;
  const card = letterCard(letter, { details: answer.el, action: audioSlot });
  let isRevealed = null;

  const update = (state) => {
    if (state.isRevealed === isRevealed) return;
    isRevealed = state.isRevealed;
    answer.setVisible(isRevealed);
    card.setLabels({
      showConsonantClass: isRevealed,
      badge: QuizSession.isRepeat(state) ? strings.quizRepeatBadge : null,
    });
    setClickable(card.el, isRevealed ? null : actions.reveal);
    if (audioSlot && isRevealed) audioSlot.replaceChildren(pronounceButton(audio, letter));
    if (audioSlot) audioSlot.className = isRevealed ? '' : 'audio-spacer';
  };
  update(session);
  return { el: card.el, update };
}

function quizActions(actions) {
  const questionText = h('p', { class: 'question-text title-medium' }, strings.quizDidYouGetIt);
  const buttons = h('div', { class: 'row' });
  const el = h('div', { class: 'quiz-actions' }, questionText, buttons);
  let isRevealed = null;

  const update = (state) => {
    if (state.isRevealed === isRevealed) return;
    isRevealed = state.isRevealed;
    // Always laid out so the buttons stay in place when the answer is revealed.
    questionText.classList.toggle('hidden', !isRevealed);
    questionText.setAttribute('aria-hidden', String(!isRevealed));
    if (isRevealed) {
      buttons.replaceChildren(
        button({
          variant: 'outlined',
          size: 'taller',
          text: strings.quizWrong,
          leadingIcon: 'close',
          className: 'error',
          onClick: () => actions.answer(false),
        }),
        button({
          variant: 'filled',
          size: 'taller',
          text: strings.quizRight,
          leadingIcon: 'check',
          onClick: () => actions.answer(true),
        }),
      );
    } else {
      buttons.replaceChildren(
        button({ variant: 'filled', size: 'taller', text: strings.quizShowAnswer, onClick: actions.reveal }),
      );
    }
  };
  return { el, update };
}

/**
 * A question that shows the transliteration of a letter, with its pronunciation when there is a
 * recording, and asks to pick the matching letter out of several options.
 */
function findTheLetter(session, letters, audio, actions) {
  const card = animatedQuestion((state) => promptCard(letters[QuizSession.current(state)], state, audio));
  const choices = animatedQuestion((state) => choiceGrid(state, letters, actions), 'choice-slot');
  const feedback = findFeedback(actions);
  const controls = h('div', { class: 'find-controls' }, choices.el, feedback.el);
  const layout = quizLayout(session, card.el, controls);

  const update = (state) => {
    layout.updateProgress(state);
    card.show(state);
    choices.show(state);
    feedback.update(state);
  };
  update(session);
  return { el: layout.el, update };
}

function promptCard(letter, session, audio) {
  // The Thai name contains the letter itself and the meaning can give it away, so both only
  // appear once an option was picked.
  const details = letterNameAndMeaning(letter, 'details');
  let labels = h('div', {});
  const el = h(
    'div',
    { class: 'prompt-card elevated-card' },
    h(
      'div',
      { class: 'prompt-card-content' },
      h(
        'div',
        { class: 'prompt-card-body' },
        h('p', { class: 'prompt body-large on-surface-variant' }, strings.findPrompt),
        h('p', { class: 'transliteration display-small medium' }, letter.transliteration),
        details,
        letter.audioFile && pronounceButton(audio, letter),
      ),
      labels,
    ),
  );
  let isAnswered = null;

  const update = (state) => {
    if (state.isRevealed === isAnswered) return;
    isAnswered = state.isRevealed;
    details.classList.toggle('hidden', !isAnswered);
    details.setAttribute('aria-hidden', String(!isAnswered));
    const updated = letterLabels(letter, {
      showConsonantClass: isAnswered,
      badge: QuizSession.isRepeat(state) ? strings.quizRepeatBadge : null,
    });
    labels.replaceWith(updated);
    labels = updated;
  };
  update(session);
  return { el, update };
}

function choiceGrid(session, letters, actions) {
  const buttons = session.choices.map((choice) => {
    const choiceButton = h(
      'button',
      { type: 'button', class: 'choice ripple', onClick: () => actions.select(choice) },
      h('span', { class: 'thai', lang: 'th' }, letters[choice].symbol),
    );
    return { choice, button: choiceButton };
  });
  const el = h('div', { class: 'choice-grid' }, buttons.map(({ button: choiceButton }) => choiceButton));

  const update = (state) => {
    for (const { choice, button: choiceButton } of buttons) {
      const kind = !state.isRevealed
        ? 'open'
        : choice === QuizSession.current(state)
          ? 'correct'
          : choice === state.selected
            ? 'wrong'
            : 'other';
      choiceButton.className = `choice ${kind === 'open' ? 'ripple' : kind}`;
      choiceButton.disabled = kind !== 'open';
      choiceButton.querySelector('.result-icon')?.remove();
      // An icon as well as the colour, so the result doesn't rely on telling colours apart.
      if (kind === 'correct' || kind === 'wrong') {
        const resultIcon = icon(kind === 'correct' ? 'checkCircle' : 'cancel', 'result-icon');
        resultIcon.removeAttribute('aria-hidden');
        resultIcon.setAttribute('role', 'img');
        resultIcon.setAttribute('aria-label', kind === 'correct' ? strings.findChoiceCorrect : strings.findChoiceWrong);
        choiceButton.append(resultIcon);
      }
    }
  };
  update(session);
  return { el, update };
}

function findFeedback(actions) {
  const text = h('p', { class: 'text title-medium', 'aria-live': 'polite' });
  const next = button({ variant: 'filled', size: 'taller', text: strings.next, onClick: actions.next });
  const el = h('div', { class: 'feedback' }, text, next);

  const update = (state) => {
    if (!state.isRevealed) {
      text.textContent = strings.findHint;
      text.className = 'text title-medium hint';
    } else if (QuizSession.isSelectionCorrect(state)) {
      text.textContent = strings.findCorrect;
      text.className = 'text title-medium';
    } else {
      text.textContent = strings.findWrong;
      text.className = 'text title-medium error';
    }
    next.disabled = !state.isRevealed;
  };
  return { el, update };
}

function quizResults(session, letters, actions, ctx) {
  const misses = [...session.misses].sort((a, b) => b[1] - a[1]);
  const el = h(
    'div',
    { class: 'results' },
    h(
      'div',
      { class: 'results-content' },
      h('div', { class: 'trophy' }, icon('emojiEvents')),
      h('h2', { class: 'headline-medium semibold', style: { marginTop: '20px' } }, strings.resultsTitle),
      h(
        'p',
        { class: 'title-medium on-surface-variant', style: { marginTop: '8px' } },
        strings.resultsScore(QuizSession.firstTryCorrect(session), session.total),
      ),
      misses.length === 0
        ? h('p', { class: 'body-large', style: { marginTop: '24px', maxWidth: '480px' } }, strings.resultsPerfect)
        : [
          h('h3', { class: 'title-small', style: { margin: '24px 0 12px' } }, strings.resultsMissedHeading),
          h(
            'div',
            { class: 'missed-letters' },
            misses.map(([index, count]) =>
              h(
                'div',
                { class: 'missed-letter' },
                h('span', { class: 'thai', lang: 'th' }, letters[index].symbol),
                h('span', { class: 'label-large' }, letters[index].transliteration),
                h('span', { class: 'count label-medium' }, strings.resultsMissCount(count)),
              ),
            ),
          ),
        ],
      h(
        'div',
        { class: 'results-buttons' },
        button({ variant: 'filled', size: 'tall', text: strings.resultsNewQuiz, leadingIcon: 'replay', onClick: actions.restart }),
        button({ variant: 'outlined', size: 'tall', text: strings.resultsHome, onClick: ctx.back }),
      ),
    ),
  );
  return { el, update() {} };
}
