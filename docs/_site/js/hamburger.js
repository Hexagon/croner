document.addEventListener("DOMContentLoaded", () => {
  // Show/Hide hamburger menu
  document.getElementById("hamburger-wrapper").addEventListener(
    "click",
    function () {
      var sidebar = document.querySelector("aside");
      if (sidebar.style.display === "none" || sidebar.style.display === "") {
        sidebar.style.display = "block";
      } else {
        sidebar.style.display = "";
      }
    },
  );

  // Hide hamburger menu when clicking outside
  document.addEventListener("click", function (event) {
    var sidebar = document.querySelector("aside");
    var isClickInside = sidebar.contains(event.target);
    var isHamburgerClicked = document.getElementById("hamburger-wrapper")
      .contains(event.target);

    if (!isClickInside && !isHamburgerClicked && window.innerWidth <= 992) {
      sidebar.style.display = "";
    }
  });
});
