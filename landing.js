// CareBridge Bangladesh - Landing Page Interactions

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  init3DCards();
  initNavScroll();
  initThemeSync();
});

/* -------------------------------------------------------------------------- */
/* THEME SYNC                                                                 */
/* -------------------------------------------------------------------------- */
function initThemeSync() {
  const saved = localStorage.getItem('carebridge_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

/* -------------------------------------------------------------------------- */
/* SCROLL ANIMATIONS                                                          */
/* -------------------------------------------------------------------------- */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.category-3d-card, .feature-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}

/* -------------------------------------------------------------------------- */
/* 3D CARD TILT EFFECT                                                       */
/* -------------------------------------------------------------------------- */
function init3DCards() {
  document.querySelectorAll('.category-3d-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.setAttribute('title', 'Click to inspect in CareBridge Live Dashboard');
    
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-category') || 'Emergency Aid';
      if (window.loginDemoUser) {
        window.loginDemoUser(`Coordinator (${cat.toUpperCase()})`);
      } else {
        window.location.href = 'index.html';
      }
    });

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  // Hero floating cards parallax
  document.querySelectorAll('.floating-card').forEach((card, index) => {
    card.addEventListener('mousemove', (e) => {
      const speed = (index + 1) * 0.5;
      const x = (window.innerWidth / 2 - e.clientX) / speed;
      const y = (window.innerHeight / 2 - e.clientY) / speed;
      card.style.transform = `translate(${x}px, ${y}px)`;
    });
  });
}

/* -------------------------------------------------------------------------- */
/* NAV SCROLL EFFECT                                                          */
/* -------------------------------------------------------------------------- */
function initNavScroll() {
  const nav = document.querySelector('.landing-nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    } else {
      nav.style.boxShadow = 'none';
    }
  });
}

// Add animate-in styles dynamically
const style = document.createElement('style');
style.textContent = `
  .animate-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(style);