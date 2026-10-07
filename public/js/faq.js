/**
 * KINGAQUA ACADEMY — FAQ Accordion
 * Animated, accessible accordion component
 */

'use strict';

(function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  if (!faqItems.length) return;

  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');

      // Close all other items (accordion behavior)
      faqItems.forEach(function (otherItem) {
        if (otherItem !== item && otherItem.classList.contains('open')) {
          closeItem(otherItem);
        }
      });

      // Toggle current
      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });

    // Keyboard accessibility
    question.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
    });
  });

  function openItem(item) {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const inner = answer.querySelector('.faq-answer-inner');

    item.classList.add('open');
    question.setAttribute('aria-expanded', 'true');

    // Animate height
    const targetHeight = inner ? inner.offsetHeight + 32 : 0; // +32 for padding
    answer.style.maxHeight = targetHeight + 'px';
  }

  function closeItem(item) {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    item.classList.remove('open');
    question.setAttribute('aria-expanded', 'false');
    answer.style.maxHeight = '0';
  }
})();
