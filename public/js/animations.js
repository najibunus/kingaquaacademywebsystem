/**
 * KINGAQUA ACADEMY — Scroll Reveal Animations
 * Intersection Observer-based entrance animations
 */

'use strict';

(function initScrollReveal() {
  // Selectors for all reveal types
  const revealSelectors = [
    '.reveal',
    '.reveal-left',
    '.reveal-right',
    '.reveal-scale',
  ];

  const allRevealElements = document.querySelectorAll(revealSelectors.join(','));

  if (!allRevealElements.length) return;

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Immediately show all elements without animation
    allRevealElements.forEach(function (el) {
      el.classList.add('revealed');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          // Unobserve after first reveal (one-time animation)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: '0px 0px -80px 0px', // Trigger slightly before bottom of viewport
      threshold: 0.08,
    }
  );

  allRevealElements.forEach(function (el) {
    observer.observe(el);
  });
})();
