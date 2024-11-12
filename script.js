const searchInput = document.getElementById("search-input");
const latestGrid = document.getElementById("latest-grid");
const paginationContainer = document.getElementById("pagination");
const statusMessage = document.getElementById("status-message");
const suggestionBox = document.getElementById("suggestion-box");
let pages = [];
const itemsPerPage = 5;
let currentPage = 1;
let totalPages = 1;
let searchQuery = "";
document.addEventListener("DOMContentLoaded", () => {
  pages = Array.from(document.querySelectorAll(".latest-grid-item"));
  totalPages = Math.ceil(pages.length / itemsPerPage);
  displayPages();
  setupPagination();
  initializePostExpansion();
});
searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("keydown", handleSearchKeyDown);
function handleSearchInput(event) {
  const query = searchInput.value.trim().toLowerCase();
  searchQuery = query;
  currentPage = 1;
  filterPages();
  setupPagination();
}
function handleSearchKeyDown(event) {
  if (
    suggestionBox.style.display === "block" &&
    (event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter")
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = suggestionBox.querySelector(".suggestion-item.selected");
      if (selected) {
        selectSuggestion(selected);
      }
    }
  }
}
function filterPages() {
  pages.forEach((page) => {
    const title = page
      .querySelector(".card-header h2")
      .textContent.toLowerCase();
    const description = page
      .querySelector(".description")
      .textContent.toLowerCase();
    const body = page.querySelector(".body-content").textContent.toLowerCase();
    if (
      title.includes(searchQuery) ||
      description.includes(searchQuery) ||
      body.includes(searchQuery)
    ) {
      page.style.display = "flex";
    } else {
      page.style.display = "none";
      page.classList.remove("expanded");
    }
  });
  const visiblePages = pages.filter((page) => page.style.display !== "none");
  totalPages = Math.ceil(visiblePages.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  showCurrentPage();
}
function showCurrentPage() {
  const visiblePages = pages.filter((page) => page.style.display !== "none");
  visiblePages.forEach((page, index) => {
    if (
      index >= (currentPage - 1) * itemsPerPage &&
      index < currentPage * itemsPerPage
    ) {
      page.style.display = "flex";
    } else {
      page.style.display = "none";
      page.classList.remove("expanded");
    }
  });
}
function displayPages() {
  showCurrentPage();
}
function setupPagination() {
  paginationContainer.innerHTML = "";
  if (totalPages <= 1) return;
  const prevButton = document.createElement("button");
  prevButton.textContent = "⬅️";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      showCurrentPage();
      setupPagination();
      scrollToTop();
    }
  });
  paginationContainer.appendChild(prevButton);
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => {
      currentPage = i;
      showCurrentPage();
      setupPagination();
      scrollToTop();
    });
    paginationContainer.appendChild(pageButton);
  }
  const nextButton = document.createElement("button");
  nextButton.textContent = "➡️";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      showCurrentPage();
      setupPagination();
      scrollToTop();
    }
  });
  paginationContainer.appendChild(nextButton);
}
function scrollToTop() {
  latestGrid.scrollIntoView({ behavior: "smooth" });
}
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("page-link")) {
    e.preventDefault();
    const pageId = e.target.getAttribute("data-page-id");
    const targetElement = document.getElementById(`page-${pageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      targetElement.classList.add("highlight");
      setTimeout(() => {
        targetElement.classList.remove("highlight");
      }, 2000);
    }
  }
});
function initializePostExpansion() {
  pages.forEach((page) => {
    page.addEventListener("click", (event) => {
      if (event.target.closest("a") || event.target.closest("button")) {
        return;
      }
      page.classList.toggle("expanded");
      const overlay = document.querySelector(".expanded-overlay");
      if (page.classList.contains("expanded")) {
        overlay.style.display = "block";
        document.body.classList.add("no-scroll");
      } else {
        overlay.style.display = "none";
        document.body.classList.remove("no-scroll");
      }
    });
  });
}
