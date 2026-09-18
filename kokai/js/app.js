// Starts the app and navigates between its screens, with the browser history as the back stack.

import { parseLetters } from './data.js';
import { installRipples } from './dom.js';
import { AudioPlayer } from './audio.js';
import { SessionStore, Settings } from './store.js';
import { createHome } from './home.js';
import { createFlashcards } from './flashcards.js';
import { createQuiz } from './quiz.js';

const TRANSITION_MILLIS = 700;

async function readText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.text();
}

async function start() {
  const [lettersCsv, audioIndexCsv] = await Promise.all([readText('letters.csv'), readText('audio/index.csv')]);
  const letters = parseLetters(lettersCsv, audioIndexCsv);
  const settings = new Settings();
  const sessions = new SessionStore(letters);
  const audio = new AudioPlayer();
  const root = document.getElementById('app');

  // What the home screen shows when returning to it: whether the filter is open and how far down it
  // was scrolled.
  const homeUiState = { filterExpanded: false, scrollTop: 0, ...history.state?.ui };

  /** The screen on display, as `{ entry, screen }` where `entry` is its history state. */
  let current = null;

  const ctx = {
    letters,
    settings,
    sessions,
    audio,
    openFlashcards: (args) => navigate({ screen: 'flashcards', args }),
    openQuiz: (args) => navigate({ screen: 'quiz', args }),
    back() {
      // Ignores accidental double taps while the screen is already being left.
      if (!current || current.entry.screen === 'home' || current.isLeaving) return;
      current.isLeaving = true;
      if (history.state?.depth > 0) history.back();
      else show({ screen: 'home', depth: 0 }, 'replace');
    },
    /** Keeps the state of the current screen, so it's restored after reloading the page. */
    saveScreenState(state) {
      try {
        history.replaceState({ ...history.state, state }, '');
      } catch {
        // Safari limits how often this is allowed, and the state is only needed after reloading.
      }
    },
  };

  function navigate(entry) {
    // Only the home screen opens other screens, and only once.
    if (!current || current.entry.screen !== 'home' || current.isLeaving) return;
    current.isLeaving = true;
    history.replaceState({ ...history.state, ui: { ...homeUiState } }, '');
    show({ ...entry, depth: 1 }, 'push');
  }

  function create(entry) {
    switch (entry.screen) {
      case 'flashcards':
        return createFlashcards(ctx, entry.args, entry.state);
      case 'quiz':
        return createQuiz(ctx, entry.args, entry.state);
      default:
        return createHome(ctx, homeUiState);
    }
  }

  /** Shows the screen for a history `entry`, after adding it to the history as given by `mode`. */
  function show(entry, mode) {
    const url = entry.screen === 'home' ? location.pathname + location.search : `#${entry.screen}`;
    if (mode === 'push') history.pushState(entry, '', url);
    else if (mode === 'replace') history.replaceState(entry, '', url);

    const previous = current;
    const screen = create(entry);
    current = { entry, screen, isLeaving: false };
    if (previous) {
      previous.screen.dispose();
      previous.screen.el.classList.add('leaving');
      previous.screen.el.inert = true;
      setTimeout(() => previous.screen.el.remove(), TRANSITION_MILLIS);
      screen.el.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => screen.el.classList.remove('entering')));
    }
    root.append(screen.el);
    screen.onMount();
  }

  window.addEventListener('popstate', (event) => {
    const entry = event.state?.screen ? event.state : { screen: 'home', depth: 0 };
    if (entry.screen === 'home' && entry.ui) Object.assign(homeUiState, entry.ui);
    show(entry, null);
  });

  // Recordings stop when the app goes to the background, like when leaving the Android app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') audio.stop();
  });

  installRipples();
  if (history.state?.screen) show(history.state, null);
  else show({ screen: 'home', depth: 0 }, 'replace');

  // Caches the app, so it keeps working offline like the Android app.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
