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

  const childrenContainer = document.getElementById('children-container');
  const addChildBtn = document.getElementById('add-child-btn');

  // Helper to re-index all child badges and remove buttons
  function updateChildIndices() {
    if (!childrenContainer) return;
    const cards = childrenContainer.querySelectorAll('.child-card');
    cards.forEach(function (card, index) {
      const idx = index + 1;
      card.setAttribute('data-index', idx);
      const badge = card.querySelector('.child-badge');
      if (badge) badge.textContent = 'Child ' + idx;

      // Ensure remove button exists for children > 1
      let removeBtn = card.querySelector('.remove-child-btn');
      if (idx > 1 && !removeBtn) {
        removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-child-btn';
        removeBtn.innerHTML = '&times; Remove';
        removeBtn.style.cssText =
          'background:none; border:none; color:#ef4444; font-size:12px; font-weight:700; cursor:pointer; padding:2px 6px;';
        removeBtn.addEventListener('click', function () {
          card.remove();
          updateChildIndices();
        });
        const header = card.querySelector('div:first-child');
        if (header) header.appendChild(removeBtn);
      } else if (idx === 1 && removeBtn) {
        removeBtn.remove();
      }
    });
    if (window.KingAquaI18n && typeof window.KingAquaI18n.refreshChildren === 'function') {
      window.KingAquaI18n.refreshChildren();
    }
  }

  // Create and append a new child row
  function addNewChildRow(autoFocus) {
    if (!childrenContainer) return null;
    const currentCount = childrenContainer.querySelectorAll('.child-card').length;
    if (currentCount >= 8) return null; // maximum reasonable limit

    const nextIndex = currentCount + 1;
    const card = document.createElement('div');
    card.className = 'child-card';
    card.setAttribute('data-index', nextIndex);
    card.style.cssText =
      'background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; position:relative;';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="child-badge" style="font-size:12px; font-weight:700; color:#0369a1; background:#e0f2fe; padding:2px 8px; border-radius:4px;">Child ${nextIndex}</span>
        <button type="button" class="remove-child-btn" style="background:none; border:none; color:#ef4444; font-size:12px; font-weight:700; cursor:pointer; padding:2px 6px;">&times; Remove</button>
      </div>
      <div class="form-row child-row-grid" style="margin-bottom:8px;">
        <div>
          <input type="text" class="form-input child-name" placeholder="Child's Full Name *" required />
        </div>
        <div>
          <input type="number" min="1" max="25" class="form-input child-age" placeholder="Age (e.g. 7) *" required />
        </div>
      </div>
      <div>
        <input type="text" class="form-input child-notes" style="font-size:13px;" placeholder="Swimming Experience / Notes (e.g. Beginner, water phobia, asthma...)" />
      </div>
    `;

    // Hook up remove button
    const removeBtn = card.querySelector('.remove-child-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        card.remove();
        updateChildIndices();
      });
    }

    // Hook up auto-add on typing in the child's name
    hookChildAutoAdd(card);

    childrenContainer.appendChild(card);
    updateChildIndices();

    if (autoFocus) {
      const nameInp = card.querySelector('.child-name');
      if (nameInp) nameInp.focus();
    }

    return card;
  }

  // Hook auto-add logic: when user types in the last child box, automatically add the next child
  function hookChildAutoAdd(card) {
    const nameInput = card.querySelector('.child-name');
    if (!nameInput) return;

    let hasTriggered = false;
    nameInput.addEventListener('input', function () {
      if (hasTriggered) return;
      const cards = childrenContainer.querySelectorAll('.child-card');
      const isLast = cards[cards.length - 1] === card;

      if (isLast && nameInput.value.trim().length >= 2) {
        hasTriggered = true;
        addNewChildRow(false);
      }
    });
  }

  // Hook first child
  if (childrenContainer) {
    const firstCard = childrenContainer.querySelector('.child-card');
    if (firstCard) hookChildAutoAdd(firstCard);
  }

  // Manual "+ Add Another Child" button
  if (addChildBtn) {
    addChildBtn.addEventListener('click', function () {
      addNewChildRow(true);
    });
  }

  // Connect program card "Enroll Now" buttons to form dropdown
  const progBtnMap = {
    'prog-beginner-btn': 'UTHM BEGINNER (BEG01)',
    'prog-kiddies-btn': 'UTHM KIDDIES (KID01)',
    'prog-aquaplay-btn': 'AQUAPLAY (AQP02)',
    'prog-novice-btn': 'UTHM NOVICE (NV01)',
    'prog-advanced-btn': 'UTHM ADVANCE (ADV01)',
    'prog-private-btn': 'UTHM PRIVATE (PRV01)',
    'prog-ladies-btn': 'UTHM LADIES (LDS01)',
    'prog-mens-btn': 'UTHM MEN (MEN01)',
  };

  Object.keys(progBtnMap).forEach(function (btnId) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function () {
        const programSelect = document.getElementById('form-program');
        if (programSelect) {
          programSelect.value = progBtnMap[btnId];
        }
      });
    }
  });

  // Form Submit Handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('form-submit-btn');
    const nameInput = document.getElementById('form-name');
    const phoneInput = document.getElementById('form-phone');
    const emailInput = document.getElementById('form-email');
    const venueSelect = document.getElementById('form-venue');
    const programSelect = document.getElementById('form-program');
    const messageInput = document.getElementById('form-message');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const venue = venueSelect && venueSelect.selectedIndex > 0 ? venueSelect.options[venueSelect.selectedIndex].text : '';
    const programText = programSelect && programSelect.selectedIndex > 0 ? programSelect.options[programSelect.selectedIndex].text : '';
    const message = messageInput ? messageInput.value.trim() : '';

    // Validation for Parent
    if (!name || !phone) {
      showFormMessage('Please fill in your name and phone number.', 'error');
      if (!name && nameInput) nameInput.focus();
      else if (!phone && phoneInput) phoneInput.focus();
      return;
    }

    if (!venue) {
      showFormMessage('Please select your preferred training venue.', 'error');
      if (venueSelect) venueSelect.focus();
      return;
    }

    // Collect all valid children
    const childCards = childrenContainer ? childrenContainer.querySelectorAll('.child-card') : [];
    const childrenList = [];
    let hasIncompleteChild = false;

    childCards.forEach(function (card) {
      const cNameInput = card.querySelector('.child-name');
      const cAgeInput = card.querySelector('.child-age');
      const cNotesInput = card.querySelector('.child-notes');

      const cName = cNameInput ? cNameInput.value.trim() : '';
      const cAge = cAgeInput ? cAgeInput.value.trim() : '';
      const cNotes = cNotesInput ? cNotesInput.value.trim() : '';

      // If user started typing a name or age
      if (cName || cAge) {
        if (!cName || !cAge) {
          hasIncompleteChild = true;
        } else {
          childrenList.push({ name: cName, age: cAge, notes: cNotes });
        }
      }
    });

    if (childrenList.length === 0) {
      showFormMessage('Please enter at least one child (Name & Age) to register.', 'error');
      const firstChildName = form.querySelector('.child-name');
      if (firstChildName) firstChildName.focus();
      return;
    }

    if (hasIncompleteChild) {
      showFormMessage('Please provide both the Name and Age for each child you are registering.', 'error');
      return;
    }

    // Build children section text
    const childrenFormatted = childrenList
      .map(function (c, i) {
        let line = `${i + 1}. *${c.name}* (Age: ${c.age} years old)`;
        if (c.notes) {
          line += `\n   Notes: ${c.notes}`;
        }
        return line;
      })
      .join('\n');

    // Build professional WhatsApp message
    const lines = [
      '🏊‍♂️ *KINGAQUA ACADEMY — REGISTRATION & INQUIRY*',
      '----------------------------------------',
      `*Parent / Guardian:* ${name}`,
      `*Contact Phone:* ${phone}`,
      email ? `*Email:* ${email}` : '',
      `*Preferred Venue:* ${venue}`,
      programText ? `*Program of Interest:* ${programText}` : '',
      '----------------------------------------',
      `*👶 Registered Children (${childrenList.length}):*`,
      childrenFormatted,
      message ? '----------------------------------------\n*💬 Other Enquiries / Questions:*\n' + message : '',
      '----------------------------------------',
      '_Sent via Kingaqua Academy Website (kingaquaacademy.com)_'
    ].filter(Boolean);

    const fullMessage = lines.join('\n');
    const waUrl = 'https://wa.me/60195177001?text=' + encodeURIComponent(fullMessage);

    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.textContent = 'Opening WhatsApp...';
    submitBtn.disabled = true;

    showFormMessage(
      `Opening WhatsApp with details for ${childrenList.length} child/children to 019-517 7001...`,
      'success'
    );

    // Open WhatsApp
    const waWindow = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!waWindow || waWindow.closed || typeof waWindow.closed === 'undefined') {
      window.location.href = waUrl;
    }

    setTimeout(function () {
      submitBtn.innerHTML = originalBtnContent;
      submitBtn.disabled = false;
    }, 4000);
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
        margin-top: 8px;
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
    }, 6000);
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
