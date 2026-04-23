const mobileMenu = document.getElementById('mobile-menu');
const mobileOverlay = document.getElementById('mobile-overlay');

mobileMenu.addEventListener('click', () => {
  mobileOverlay.classList.toggle('active');
});

// Close mobile menu when clicking outside
mobileOverlay.addEventListener('click', (e) => {
  if (e.target === mobileOverlay) {
    mobileOverlay.classList.remove('active');
  }
});
// Auto-update year
document.getElementById('year').textContent = new Date().getFullYear();