/**
 * Theme management for the dashboard
 * Handles dark mode toggle and persistence
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const htmlElement = document.documentElement;

    // Load saved theme
    const savedTheme = localStorage.getItem('dashboard-theme') || 'light';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('dashboard-theme', theme);
        
        if (theme === 'dark') {
            themeIcon.classList.replace('bi-moon-fill', 'bi-sun-fill');
            // If using Lucide or FontAwesome, update classes accordingly
            if (themeIcon.classList.contains('lucide-moon')) {
                themeIcon.innerHTML = `<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>`;
            }
        } else {
            themeIcon.classList.replace('bi-sun-fill', 'bi-moon-fill');
            if (themeIcon.classList.contains('lucide-sun')) {
                themeIcon.innerHTML = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
            }
        }

        // Trigger chart updates if they exist
        if (window.updateChartsTheme) {
            window.updateChartsTheme(theme);
        }
    }
});
