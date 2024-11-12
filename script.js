
const searchInput = document.getElementById("search-input");
const latestGrid = document.getElementById("latest-grid");
const paginationContainer = document.getElementById("pagination");
const statusMessage = document.getElementById("status-message");
const suggestionBox = document.getElementById("suggestion-box");

let pages = [];
const itemsPerPage = 10;
let currentPage = 1;
let totalPages = 1;
let searchQuery = "";

/* ========================================= */
/*        INITIALIZATION AND EVENTS         */
/* ========================================= */

// Load posts from posts.json on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  fetch('posts.json')
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load posts.json");
      }
      return response.json();
    })
    .then(data => {
      pages = data;
      totalPages = Math.ceil(pages.length / itemsPerPage);
      displayPages();
      setupPagination();
    })
    .catch(error => {
      console.error("Error loading posts:", error);
      latestGrid.innerHTML = `<p>Error loading posts. Please try again later.</p>`;
    });
});

/* ========================================= */
/*        SEARCH INPUT AUTOCOMPLETE          */
/* ========================================= */

// Event listeners for the search input field to handle search
searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("keydown", handleSearchKeyDown);

/* ========================================= */
/*        AUTOCOMPLETE FUNCTIONS             */
/* ========================================= */

function handleSearchInput(event) {
  const query = searchInput.value.trim().toLowerCase();
  searchQuery = query;
  currentPage = 1;
  displayPages();
  setupPagination();
}

function handleSearchKeyDown(event) {
  if (
    suggestionBox.style.display === "block" &&
    (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")
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

/* ========================================= */
/*        DISPLAY FUNCTIONS                  */
/* ========================================= */

// Function to display pages based on currentPage and searchQuery
function displayPages() {
  latestGrid.innerHTML = "";

  if (pages.length === 0) {
    latestGrid.innerHTML = `<p>No posts available.</p>`;
    return;
  }

  // Filter pages by searchQuery
  let filteredPages = pages;
  if (searchQuery !== "") {
    const isExactMatch =
      searchQuery.startsWith('"') && searchQuery.endsWith('"');
    const query = isExactMatch
      ? searchQuery.slice(1, -1).toLowerCase()
      : searchQuery;

    filteredPages = pages.filter((page) => {
      const titleMatch = page.Title.toLowerCase().includes(query);
      const bodyMatch = page.Body.toLowerCase().includes(query);

      if (isExactMatch) {
        // Exact phrase match
        return (
          page.Title.toLowerCase().includes(query) ||
          page.Body.toLowerCase().includes(query)
        );
      } else {
        // Partial match
        return titleMatch || bodyMatch;
      }
    });
  }

  if (filteredPages.length === 0) {
    latestGrid.innerHTML = `<p>No posts found matching your search.</p>`;
    return;
  }

  totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPages.length);
  const currentPages = filteredPages.slice(startIndex, endIndex);

  currentPages.forEach((page) => {
    const item = document.createElement("div");
    item.className = "latest-grid-item";
    item.id = `page-${page.id}`;

    const imgContainer = document.createElement("div");
    imgContainer.className = "image-container";
    imgContainer.style.backgroundColor = page.BgColor || "#FFFF00";
    if (page.Picture) {
      const img = document.createElement("img");
      img.src = page.Picture;
      img.alt = page.Title;
      img.onerror = function () {
        this.style.display = "none";
      };
      imgContainer.appendChild(img);
    }
    item.appendChild(imgContainer);

    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header";
    const title = document.createElement("h2");
    title.textContent = page.Title;
    title.setAttribute("title", page.Title);
    cardHeader.appendChild(title);
    item.appendChild(cardHeader);

    const desc = document.createElement("h4");
    desc.className = "description";
    desc.textContent = page.Description;
    item.appendChild(desc);

    const date = document.createElement("h5");
    date.className = "date";
    date.textContent = page.Date || "No Date Provided";
    item.appendChild(date);

    const body = document.createElement("div");
    body.className = "body-content";
    const rawHTML = marked.parse(page.Body);
    const processedHTML = processLinks(rawHTML);
    body.innerHTML = DOMPurify.sanitize(processedHTML);
    item.appendChild(body);

    latestGrid.appendChild(item);
  });
}

// Function to process [[PAGE NAME]] links
function processLinks(html) {
  return html.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
    const page = pages.find((page) => page.Title === p1.trim());
    if (page) {
      return `<a href="#page-${page.id}" class="page-link" data-page-id="${page.id}">${p1.trim()}</a>`;
    } else {
      return `<span class="missing-page">${p1.trim()}</span>`;
    }
  });
}

/* ========================================= */
/*        PAGINATION FUNCTIONS               */
/* ========================================= */

// Function to set up pagination buttons
function setupPagination() {
  paginationContainer.innerHTML = "";
  if (totalPages <= 1) return;

  // Previous Button
  const prevButton = document.createElement("button");
  prevButton.textContent = "⬅️";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayPages();
      setupPagination();
      scrollToTop();
    }
  });
  paginationContainer.appendChild(prevButton);

  // Page Number Buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => {
      currentPage = i;
      displayPages();
      setupPagination();
      scrollToTop();
    });
    paginationContainer.appendChild(pageButton);
  }

  // Next Button
  const nextButton = document.createElement("button");
  nextButton.textContent = "➡️";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayPages();
      setupPagination();
      scrollToTop();
    }
  });
  paginationContainer.appendChild(nextButton);
}

// Function to scroll to the top of the posts
function scrollToTop() {
  latestGrid.scrollIntoView({ behavior: "smooth" });
}

/* ========================================= */
/*        SUGGESTION BOX FUNCTIONS           */
/* ========================================= */

// Optional: Implement autocomplete suggestions for search
// You can enhance this section based on your requirements

/* ========================================= */
/*        PAGE LINK SCROLLING                 */
/* ========================================= */

// Smooth scrolling for page links
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("page-link")) {
    e.preventDefault();
    const pageId = e.target.getAttribute("data-page-id");
    const targetElement = document.getElementById(`page-${pageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      // Optionally, highlight the target element
      targetElement.classList.add("highlight");
      setTimeout(() => {
        targetElement.classList.remove("highlight");
      }, 2000);
    }
  }
});
