// Interface elements shared by several screens.

import { h, icon } from './dom.js';
import { strings } from './strings.js';

// The Latin combining marks that stand in for fon thong and fan nu, which have no Thai code points
// and are missing from Noto Sans Thai Looped.
const LATIN_MARKS = /[\u0300-\u036F]/u;

/** Whether `symbol` holds one of the Latin combining marks that Noto Sans Thai Looped is missing. */
export function usesLatinMarks(symbol) {
  return LATIN_MARKS.test(symbol);
}

/** The symbol of a letter, in a font that has all of its characters. */
export function symbolText(symbol, className = null) {
  // Symbols with a Latin mark are drawn entirely in Noto Sans, since browsers could otherwise take
  // the mark and its dotted circle from different fonts.
  return h('span', { class: [className, usesLatinMarks(symbol) && 'latin-marks'], lang: 'th' }, symbol);
}

/**
 * A Material button. The `variant` is `filled`, `tonal`, `outlined` or `text`, and `size` makes it
 * `tall` (52px) or `taller` (56px) than the default 40px.
 */
export function button({ variant, text, leadingIcon, trailingIcon, onClick, size, className, disabled, smallIcon }) {
  return h(
    'button',
    {
      type: 'button',
      class: [
        'button ripple label-large',
        variant,
        size,
        leadingIcon && 'with-icon',
        trailingIcon && 'with-trailing-icon',
        className,
      ],
      disabled,
      onClick,
    },
    leadingIcon && icon(leadingIcon, smallIcon ? 'small' : ''),
    h('span', { class: 'label' }, text),
    trailingIcon && icon(trailingIcon),
  );
}

export function iconButton({ iconName, label, onClick, className }) {
  return h(
    'button',
    { type: 'button', class: ['icon-button ripple', className], 'aria-label': label, title: label, onClick },
    icon(iconName),
  );
}

export function topAppBar({ title, onBack, actions = [] }) {
  return h(
    'header',
    { class: 'top-app-bar' },
    iconButton({ iconName: 'arrowBack', label: strings.back, onClick: onBack, className: 'nav' }),
    h('h1', { class: 'title title-large' }, title),
    actions,
  );
}

/** A determinate progress bar, with a `set` method that takes the progress from 0 to 1. */
export function linearProgress() {
  const el = h(
    'div',
    { class: 'linear-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('div', { class: 'track' }),
    h('div', { class: 'stop' }),
    h('div', { class: 'indicator' }),
  );
  return {
    el,
    set(progress) {
      el.style.setProperty('--progress', progress);
      el.setAttribute('aria-valuenow', Math.round(progress * 100));
      el.classList.toggle('empty', progress <= 0);
      el.classList.toggle('full', progress >= 1);
    },
  };
}

/** Labels with the category and consonant class of a letter, plus an optional `badge`. */
export function letterLabels(letter, { showConsonantClass, badge }) {
  return h(
    'div',
    { class: 'labels' },
    h('span', { class: 'chip-label category label-large' }, strings.category[letter.category]),
    showConsonantClass && letter.consonantClass && h(
      'span',
      { class: `chip-label label-large ${letter.consonantClass.toLowerCase()}` },
      strings.consonantClass[letter.consonantClass],
    ),
    badge && h('span', { class: 'chip-label badge label-large' }, badge),
  );
}

/** The name of a letter in Thai followed by its meaning, if it has one. */
export function letterNameAndMeaning(letter, className) {
  return h(
    'p',
    { class: ['name-and-meaning title-medium', className], style: { whiteSpace: 'pre-wrap' } },
    h('span', { class: 'thai', lang: 'th' }, letter.thaiName),
    letter.meaning && `  ·  ${letter.meaning}`,
  );
}

/**
 * The transliteration, Thai name and meaning of a letter. While hidden, `placeholder` is shown
 * instead, and the answer keeps its space so the card doesn't shift when it's revealed.
 */
export function letterAnswer(letter, { isVisible, placeholder }) {
  const answer = h(
    'div',
    { class: 'answer' },
    h('p', { class: 'headline-medium medium' }, letter.transliteration),
    letterNameAndMeaning(letter),
  );
  const placeholderText = h('p', { class: 'body-large on-surface-variant' }, placeholder);
  const el = h('div', { class: 'letter-answer' }, answer, placeholderText);
  const setVisible = (visible) => {
    el.classList.toggle('hidden', !visible);
    answer.setAttribute('aria-hidden', String(!visible));
    placeholderText.hidden = visible;
  };
  setVisible(isVisible);
  return { el, setVisible };
}

/** Plays the pronunciation of a letter, showing an equaliser icon while it's playing. */
export function pronounceButton(audio, letter) {
  const el = button({
    variant: 'tonal',
    text: strings.listen,
    leadingIcon: 'volumeUp',
    smallIcon: true,
    className: 'pronounce-button',
    onClick: () => audio.play(letter.audioFile),
  });
  const update = (playingFile) => {
    const isPlaying = playingFile === letter.audioFile;
    el.querySelector('svg.icon').replaceWith(icon(isPlaying ? 'graphicEq' : 'volumeUp', 'small'));
  };
  const unsubscribe = audio.subscribe((playingFile) => {
    if (!el.isConnected && el.dataset.mounted) unsubscribe();
    else update(playingFile);
  });
  requestAnimationFrame(() => (el.dataset.mounted = 'true'));
  update(audio.playingFile);
  return el;
}

/**
 * A flashcard showing a large Thai letter, with its `details` below the letter on tall cards and
 * next to it on wide ones. Returns the card and a function to replace its labels.
 */
export function letterCard(letter, { showConsonantClass = true, badge = null, details }) {
  let labels = letterLabels(letter, { showConsonantClass, badge });
  const content = h(
    'div',
    { class: 'letter-card-content' },
    h(
      'div',
      { class: 'letter-card-layout' },
      h('div', { class: 'letter-symbol' }, symbolText(letter.symbol)),
      h('div', { class: 'letter-details' }, details),
    ),
    labels,
  );
  const el = h('div', { class: 'letter-card elevated-card' }, content);
  const setLabels = (options) => {
    const updated = letterLabels(letter, options);
    labels.replaceWith(updated);
    labels = updated;
  };
  return { el, setLabels };
}

/** Makes `el` react to clicks with `onClick`, or stop reacting to them when it's null. */
export function setClickable(el, onClick) {
  if (el.clickHandler) el.removeEventListener('click', el.clickHandler);
  el.clickHandler = onClick;
  el.classList.toggle('clickable', Boolean(onClick));
  el.classList.toggle('ripple', Boolean(onClick));
  if (onClick) {
    el.addEventListener('click', onClick);
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
  } else {
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
  }
}

/** Shows a menu with `items` of `{ icon, text, onClick }` below `anchor`. */
export function showMenu(anchor, items) {
  const menu = h('div', { class: 'menu', role: 'menu' });
  const layer = h('div', { class: 'menu-layer' }, menu);
  const close = () => {
    document.removeEventListener('keydown', onKey);
    menu.classList.add('leaving');
    layer.style.pointerEvents = 'none';
    setTimeout(() => layer.remove(), 75);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  for (const item of items) {
    menu.append(
      h(
        'button',
        {
          type: 'button',
          class: 'menu-item ripple label-large',
          role: 'menuitem',
          onClick: (event) => {
            event.stopPropagation();
            close();
            item.onClick();
          },
        },
        icon(item.icon),
        item.text,
      ),
    );
  }
  layer.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(layer);

  // Opens below the anchor, lined up with its start, unless there's no room there.
  const anchorRect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const margin = 8;
  let left = anchorRect.left;
  if (left + menuRect.width > window.innerWidth - margin) left = Math.max(margin, anchorRect.right - menuRect.width);
  let top = anchorRect.bottom;
  if (top + menuRect.height > window.innerHeight - margin && anchorRect.top - menuRect.height >= margin) {
    top = anchorRect.top - menuRect.height;
    menu.classList.add('above');
  }
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.querySelector('button').focus({ preventScroll: true, focusVisible: false });
}

/** Shows an alert dialog with an icon, a title, a message and two buttons. */
export function showDialog({ iconName, title, text, confirm, dismiss, onDismiss }) {
  const close = () => {
    document.removeEventListener('keydown', onKey);
    layer.classList.add('leaving');
    layer.style.pointerEvents = 'none';
    setTimeout(() => layer.remove(), 75);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      close();
      onDismiss?.();
    }
  };
  const actionButton = ({ text: buttonText, onClick }) =>
    button({
      variant: 'text',
      text: buttonText,
      onClick: () => {
        close();
        onClick();
      },
    });
  const dialog = h(
    'div',
    { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'dialog-icon' }, icon(iconName)),
    h('h2', { class: 'dialog-title headline-small' }, title),
    h('p', { class: 'dialog-text body-medium' }, text),
    h('div', { class: 'dialog-buttons' }, actionButton(dismiss), actionButton(confirm)),
  );
  const layer = h('div', { class: 'dialog-layer' }, dialog);
  layer.addEventListener('click', (event) => {
    if (event.target === layer) {
      close();
      onDismiss?.();
    }
  });
  document.addEventListener('keydown', onKey);
  document.body.append(layer);
  return close;
}
