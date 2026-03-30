/**
 * Global Theme Controller
 */

document.addEventListener("DOMContentLoaded", () => {

    const themeToggle = document.getElementById("theme-toggle");

    const html = document.documentElement;

    const savedTheme = localStorage.getItem("theme") || "light";

    html.setAttribute("data-theme", savedTheme);

    updateIcon(savedTheme);

    if (themeToggle) {

        themeToggle.addEventListener("click", () => {

            const current = html.getAttribute("data-theme");

            const newTheme = current === "light" ? "dark" : "light";

            html.setAttribute("data-theme", newTheme);

            localStorage.setItem("theme", newTheme);

            updateIcon(newTheme);

        });

    }

    function updateIcon(theme) {

        if (!themeToggle) return;

        const icon = themeToggle.querySelector("i");

        if (!icon) return;

        if (theme === "dark") {

            icon.classList.remove("bi-moon-fill");

            icon.classList.add("bi-sun-fill");

        } else {

            icon.classList.remove("bi-sun-fill");

            icon.classList.add("bi-moon-fill");

        }

    }

});
