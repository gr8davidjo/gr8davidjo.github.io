document.addEventListener('DOMContentLoaded', () => {
  const revealTargets = document.querySelectorAll(
    '.hero-copy, .hero-card, .stat-card, .content-card, .timeline-card, .game-shell, .touch-pad'
  );
  revealTargets.forEach((element) => element.classList.add('reveal'));

  let revealRafId = 0;
  const revealState = new WeakMap();

  const updateReveals = () => {
    revealRafId = 0;
    const threshold = window.innerHeight * 0.9;

    revealTargets.forEach((element, index) => {
      if (revealState.get(element)) return;

      const rect = element.getBoundingClientRect();
      if (rect.top <= threshold) {
        element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
        element.classList.add('is-visible');
        revealState.set(element, true);
      }
    });
  };

  const scheduleRevealUpdate = () => {
    if (revealRafId) return;
    revealRafId = window.requestAnimationFrame(updateReveals);
  };

  if (typeof window.requestAnimationFrame === 'function') {
    window.addEventListener('scroll', scheduleRevealUpdate, { passive: true });
    window.addEventListener('resize', scheduleRevealUpdate);
    scheduleRevealUpdate();
  } else {
    revealTargets.forEach((element) => {
      element.classList.add('is-visible');
    });
  }

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (navToggle && siteNav) {
    const closeNav = () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          closeNav();
        }
      });
    });
  }
});
