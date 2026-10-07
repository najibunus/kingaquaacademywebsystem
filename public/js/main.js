/**
 * KINGAQUA ACADEMY — Main JavaScript
 * Navigation, Scroll Effects, Utilities
 */

'use strict';

/* ============================================
   NAVBAR — Sticky & Scroll Detection
   ============================================ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  let lastScrollY = 0;

  function onScroll() {
    const scrollY = window.scrollY;

    // Add scrolled class for style change
    if (scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Show/hide scroll-to-top button
    if (scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }

    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Run on load

  // Scroll to top
  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


/* ============================================
   MOBILE NAVIGATION
   ============================================ */
(function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('nav-mobile');
  const mobileLinks = mobileNav.querySelectorAll('.nav-mobile-link');
  const mobileCtaBtns = mobileNav.querySelectorAll('.btn');

  function openMenu() {
    toggle.classList.add('active');
    mobileNav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggle.classList.remove('active');
    mobileNav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    if (mobileNav.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggle.addEventListener('click', toggleMenu);

  // Close on link click
  [...mobileLinks, ...mobileCtaBtns].forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (
      mobileNav.classList.contains('open') &&
      !mobileNav.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      closeMenu();
    }
  });

  // Close on ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      closeMenu();
    }
  });
})();


/* ============================================
   SMOOTH SCROLLING — Anchor Links
   ============================================ */
(function initSmoothScroll() {
  const navHeight = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-height')
  ) || 80;

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });
})();


/* ============================================
   ACTIVE NAV LINK — Highlight current section
   ============================================ */
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActive() {
    const scrollMid = window.scrollY + window.innerHeight / 2;

    let currentId = '';
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollMid) {
        currentId = section.id;
      }
    });

    navLinks.forEach(function (link) {
      link.style.background = '';
      link.style.color = '';
      const href = link.getAttribute('href');
      if (href === '#' + currentId) {
        const navbar = document.getElementById('navbar');
        if (navbar.classList.contains('scrolled')) {
          link.style.background = 'rgba(106, 170, 200, 0.12)';
          link.style.color = 'var(--color-accent)';
        } else {
          link.style.background = 'rgba(255,255,255,0.15)';
          link.style.color = '#fff';
        }
      }
    });
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
})();


/* ============================================
   CONTACT FORM — Submit Handler
   ============================================ */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('form-submit-btn');
    const name = document.getElementById('form-name').value.trim();
    const phone = document.getElementById('form-phone').value.trim();

    // Simple validation
    if (!name || !phone) {
      showFormMessage('Please fill in your name and phone number.', 'error');
      return;
    }

    // Simulate send
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    setTimeout(function () {
      submitBtn.textContent = '✅ Message Sent!';
      submitBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
      showFormMessage('Thank you! We\'ll be in touch within 24 hours.', 'success');
      form.reset();

      setTimeout(function () {
        submitBtn.textContent = 'Send Message 🚀';
        submitBtn.disabled = false;
        submitBtn.style.background = '';
      }, 4000);
    }, 1200);
  });

  function showFormMessage(message, type) {
    let msgEl = form.querySelector('.form-message');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'form-message';
      msgEl.style.cssText = `
        padding: 12px 16px;
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 500;
        margin-top: 4px;
        transition: all 0.3s ease;
      `;
      form.appendChild(msgEl);
    }

    if (type === 'success') {
      msgEl.style.background = '#dcfce7';
      msgEl.style.color = '#16a34a';
      msgEl.style.border = '1px solid #86efac';
    } else {
      msgEl.style.background = '#fee2e2';
      msgEl.style.color = '#dc2626';
      msgEl.style.border = '1px solid #fca5a5';
    }

    msgEl.textContent = message;

    setTimeout(function () {
      msgEl.textContent = '';
      msgEl.style.background = '';
      msgEl.style.border = '';
    }, 5000);
  }
})();


/* ============================================
   COUNTER ANIMATION — Stats section
   ============================================ */
(function initCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  let countersStarted = false;

  function animateCounter(el, target, duration) {
    const plusEl = el.querySelector('.stat-plus');
    const plusText = plusEl ? plusEl.outerHTML : '';
    let startTime = null;
    const startVal = 0;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const currentVal = Math.round(startVal + (target - startVal) * eased);
      el.innerHTML = currentVal + plusText;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.innerHTML = target + plusText;
      }
    }

    requestAnimationFrame(step);
  }

  function startCounters() {
    if (countersStarted) return;
    countersStarted = true;
    statNumbers.forEach(function (el) {
      const target = parseInt(el.getAttribute('data-target'));
      animateCounter(el, target, 1800);
    });
  }

  // Trigger when stats band is visible
  const statsBand = document.querySelector('.stats-band');
  if (!statsBand) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        startCounters();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(statsBand);
})();
