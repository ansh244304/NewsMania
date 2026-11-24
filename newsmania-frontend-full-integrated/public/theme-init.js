// Set the theme before first paint so dark mode never flashes white.
(function () {
  try {
    var stored = localStorage.getItem("newsmania:theme");
    var dark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
  } catch (error) {
    // Theme preferences are optional when browser storage is unavailable.
  }
})();
