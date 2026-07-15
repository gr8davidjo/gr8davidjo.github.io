document.addEventListener('DOMContentLoaded', () => {
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
