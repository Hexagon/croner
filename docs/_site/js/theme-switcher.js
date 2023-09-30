document.addEventListener("DOMContentLoaded", () => {
  const html = document.documentElement;
  const switcher = document.getElementById("theme-switcher");
  const themeIcon = document.getElementById("theme-icon");

  // Function to determine whether user has a system preference for dark mode
  const userPrefersDark = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Load user preferred theme from local storage or user's system preference
  let preferredTheme = localStorage.getItem("preferredTheme");

  if (!preferredTheme) {
    preferredTheme = userPrefersDark() ? "dark" : "light";
  }
  const inverseTheme = preferredTheme === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", preferredTheme);
  switcher.setAttribute("data-theme", inverseTheme);

  // Set the correct initial icon
  themeIcon.className = preferredTheme === "dark"
    ? "fas fa-sun"
    : "fas fa-moon";

  // Event Listener for Switch Theme button
  switcher.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    const newInverseTheme = newTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    switcher.setAttribute("data-theme", newInverseTheme);
    localStorage.setItem("preferredTheme", newTheme);

    // Change the Font Awesome icon based on the new theme
    themeIcon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  });
});
