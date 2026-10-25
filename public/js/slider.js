/**
 * KINGAQUA ACADEMY — Testimonials Slider
 * Touch-friendly auto-play slider
 */

'use strict';

(function initSlider() {
  const track = document.getElementById('testimonials-track');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');
  const dotsContainer = document.getElementById('slider-dots');

  if (!track) return;

  const cards = track.querySelectorAll('.testimonial-card');
  if (!cards.length) return;

  let currentIndex = 0;
  let autoPlayTimer = null;
  let cardsPerView = getCardsPerView();
  let totalSlides = Math.ceil(cards.length / cardsPerView);

  function getCardsPerView() {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  function getSlideWidth() {
    const card = cards[0];
    if (!card) return 0;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 24;
    const trackWidth = track.parentElement.offsetWidth;
    return (trackWidth + gap) / cardsPerView;
  }

  function updateSlider(instant) {
    const slideWidth = getSlideWidth();
    track.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    track.style.transform = `translateX(-${currentIndex * slideWidth * cardsPerView}px)`;
    updateDots();
  }

  function updateDots() {
    const dots = dotsContainer.querySelectorAll('.slider-dot');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === currentIndex);
      dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
    });
  }

  function buildDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
      dot.addEventListener('click', function () {
        goTo(i);
        resetAutoPlay();
      });
      dotsContainer.appendChild(dot);
    }
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, totalSlides - 1));
    updateSlider(false);
  }

  function goNext() {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider(false);
  }

  function goPrev() {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateSlider(false);
  }

  function startAutoPlay() {
    autoPlayTimer = setInterval(goNext, 4500);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    startAutoPlay();
  }

  function stopAutoPlay() {
    clearInterval(autoPlayTimer);
  }

  // Button events
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      goNext();
      resetAutoPlay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      goPrev();
      resetAutoPlay();
    });
  }

  // Pause on hover
  track.addEventListener('mouseenter', stopAutoPlay);
  track.addEventListener('mouseleave', startAutoPlay);

  // Touch / swipe support
  let touchStartX = 0;
  let touchStartY = 0;
  let isDragging = false;

  track.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  track.addEventListener('touchend', function (e) {
    if (!isDragging) return;
    isDragging = false;

    const deltaX = touchStartX - e.changedTouches[0].clientX;
    const deltaY = touchStartY - e.changedTouches[0].clientY;

    // Only swipe if horizontal movement dominates
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goNext();
      } else {
        goPrev();
      }
      resetAutoPlay();
    }
  }, { passive: true });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    const testimonials = document.getElementById('testimonials');
    if (!testimonials) return;
    const rect = testimonials.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;

    if (e.key === 'ArrowRight') {
      goNext();
      resetAutoPlay();
    } else if (e.key === 'ArrowLeft') {
      goPrev();
      resetAutoPlay();
    }
  });

  // Handle resize
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const newCpv = getCardsPerView();
      if (newCpv !== cardsPerView) {
        cardsPerView = newCpv;
        totalSlides = Math.ceil(cards.length / cardsPerView);
        currentIndex = Math.min(currentIndex, totalSlides - 1);
        buildDots();
      }
      updateSlider(true);
    }, 200);
  });

  // Init
  buildDots();
  updateSlider(true);
  startAutoPlay();
})();

/**
 * KINGAQUA ACADEMY — Hero Image Mobile Slider
 * Touch scroll-snap + auto-sliding on mobile viewports (<= 900px)
 */
(function initHeroMobileSlider() {
  const slider = document.getElementById('hero-image-slider');
  const dotsContainer = document.getElementById('hero-slider-dots');
  if (!slider || !dotsContainer) return;

  const cards = slider.querySelectorAll('.hero-image-card');
  const dots = dotsContainer.querySelectorAll('.hero-slider-dot');
  if (!cards.length || !dots.length) return;

  let currentIdx = 0;
  let timer = null;
  let animFrame = null;
  let isProgrammaticScroll = false;

  function isMobileView() {
    return window.innerWidth <= 900;
  }

  function setActiveDot(index) {
    currentIdx = index;
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === index);
    });
  }

  function animateScrollLeft(targetLeft, duration) {
    if (animFrame) cancelAnimationFrame(animFrame);
    isProgrammaticScroll = true;
    slider.style.scrollSnapType = 'none';

    const startLeft = slider.scrollLeft;
    const distance = targetLeft - startLeft;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeInOutCubic
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      slider.scrollLeft = startLeft + distance * ease;

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        slider.scrollLeft = targetLeft;
        slider.style.scrollSnapType = 'x mandatory';
        setTimeout(function () {
          isProgrammaticScroll = false;
        }, 50);
      }
    }

    animFrame = requestAnimationFrame(step);
  }

  function scrollToSlide(index) {
    if (!isMobileView()) return;
    const card = cards[index];
    if (!card) return;
    const targetLeft = Math.max(0, card.offsetLeft - (slider.clientWidth - card.offsetWidth) / 2);
    setActiveDot(index);
    animateScrollLeft(targetLeft, 500);
  }

  function nextSlide() {
    if (!isMobileView()) return;
    const next = (currentIdx + 1) % cards.length;
    scrollToSlide(next);
  }

  function startAutoSlide() {
    stopAutoSlide();
    if (isMobileView()) {
      timer = setInterval(nextSlide, 2800);
    }
  }

  function stopAutoSlide() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Sync active dot on manual swipe / scroll
  let scrollTimeout;
  slider.addEventListener('scroll', function () {
    if (!isMobileView() || isProgrammaticScroll) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function () {
      const center = slider.scrollLeft + slider.clientWidth / 2;
      let closestIdx = 0;
      let minDiff = Infinity;
      cards.forEach(function (card, i) {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const diff = Math.abs(center - cardCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      setActiveDot(closestIdx);
    }, 60);
  }, { passive: true });

  // Dot click navigation
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      scrollToSlide(i);
      startAutoSlide();
    });
  });

  // Pause auto-slide while user is touching
  slider.addEventListener('touchstart', stopAutoSlide, { passive: true });
  slider.addEventListener('touchend', startAutoSlide, { passive: true });

  window.addEventListener('resize', function () {
    if (isMobileView()) {
      startAutoSlide();
    } else {
      stopAutoSlide();
      slider.scrollLeft = 0;
    }
  });

  startAutoSlide();
})();
