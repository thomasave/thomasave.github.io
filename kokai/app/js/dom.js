// Small helpers to build the interface out of DOM elements.

import { icons } from './icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an element with the given properties and children. Properties starting with `on` add
 * event listeners, `class` and `style` set those attributes, and the rest are set as attributes.
 */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') element.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else element.setAttribute(key, value === true ? '' : value);
  }
  append(element, children);
  return element;
}

function append(element, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(element, child);
    else element.append(child instanceof Node ? child : String(child));
  }
}

/** Returns one of the Material icons in `icons.js`. */
export function icon(name, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.innerHTML = icons[name];
  return svg;
}

/** Shows a ripple from where an element with the `ripple` class is pressed, like on Android. */
export function installRipples() {
  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target.closest('.ripple');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
    const wave = h('span', {
      class: 'ripple-wave',
      style: { left: `${x - radius}px`, top: `${y - radius}px`, width: `${radius * 2}px`, height: `${radius * 2}px` },
    });
    target.prepend(wave);
    const pressedAt = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => wave.classList.add('expanded')));

    const release = () => {
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
      // Lets a quick tap still show the ripple spreading out before it fades.
      const delay = Math.max(0, 150 - (performance.now() - pressedAt));
      setTimeout(() => {
        wave.classList.add('fading');
        setTimeout(() => wave.remove(), 200);
      }, delay);
    };
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
  });
}
