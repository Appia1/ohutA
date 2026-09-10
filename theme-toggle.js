// theme-toggle.js
/*
// Load saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  const toggleBtn = document.getElementById('toggle-theme');
  if (toggleBtn) {
    // Only home page has the button
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');

      // Save the selected theme
      if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
      } else {
        localStorage.setItem('theme', 'dark');
      }
    });
  }
});
*/


// theme-toggle.js

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-theme');
  const savedTheme = localStorage.getItem('theme');

  // Apply saved theme
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  // Update button icon/text based on current theme
  function updateButton() {
    if (document.body.classList.contains('light-mode')) {
      toggleBtn.textContent = '🌙';
    } else {
      toggleBtn.textContent = '☀️';
    }
  }

  if (toggleBtn) {
    updateButton(); // Set initial icon/text

    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');

      // Save the selected theme
      if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
      } else {
        localStorage.setItem('theme', 'dark');
      }

      updateButton(); // Update icon/text after toggle
    });
  }
});
