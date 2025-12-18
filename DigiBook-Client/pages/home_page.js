//Import functions from external file:
import {
  apiFetch,
  getCurrentUserId,
  isAdmin,
  checkTokenExpiration,
  computeRemainingText,
  logout
} from "./functions.js";

const API = "http://localhost:3001/books";

async function hideToUser() {
  try {
    let addBookBtn = document.getElementById("addBookBtn");
    let elementsNotForUser = document.getElementsByClassName("hideToUser");
    if (!isAdmin()) {
      addBookBtn.hidden = true;

      for (let e of elementsNotForUser) {
        e.hidden = true;
      }
    }
  } catch (err) {
    alert("Error : " + err.message);
  }
}
// Load all books (with optional filters)
async function loadBooks(name = "", category = "") {
  try {
    let url = API;

    const params = new URLSearchParams();
    if (name) params.append("name", name);
    if (category) params.append("category", category);

    if (params.toString()) url += `?${params.toString()}`;

    const res = await apiFetch(url);
    const books = await res.json();
    displayBooks(books);
    await loadCategories();
  } catch (err) {
    console.error("Error loading books:", err);
  }
}

// Display books as cards
function displayBooks(books) {
  const container = document.getElementById("card-list");
  container.innerHTML = "";

  books.forEach((book) => {
    const col = document.createElement("div");
    col.className = "col-lg-2 col-md-3 col-sm-6 mb-3";

    let endIso = null;

    if (book.borrower) {
      if (book.borrower.endDate) endIso = book.borrower.endDate;
    }
    // initial remaining time string (will be updated by countdown tick)

    let remainingTimeField = `<p class="card-text mb-1 "><small><strong>Remaining time : </strong> <span class="remaining-value"></span></small></p>`;

    const borrowerName = book.borrower?.userId
      ? `${book.borrower.userId.fullName} (${book.borrower.userId.id})`
      : "None";

    // Check if current user is in waiting list
    let isWaiting = book.waitingList.includes(getCurrentUserId()) || false;
    let waitBtnText = isWaiting ? "Cancel Wait" : "Wait";

    col.innerHTML = `
      <div class="card h-100 shadow-sm book-card" data-end-iso="${
        endIso || ""
      }">
        <!-- Image fully fills card top, centered -->
        <img src="${book.image || "https://via.placeholder.com/300x220"}"
             class="card-img-top"
             alt="${book.name}"
             style="width: 100%; height: 200px; object-fit: cover; object-position: center;">
        
        <div class="card-body d-flex flex-column p-2">
          <h6 class="card-title text-truncate mb-1">Name: ${
            book.name
          } --- Id: ${book.id}</h6>  
          <p class="card-text mb-1"><small><strong>Category:</strong> ${
            book.category
          }</small></p>
          <p class="card-text mb-1"><small><strong>Location:</strong> ${
            book.location
          }</small></p>
          <p class="card-text mb-1"><small><strong>Borrower:</strong> ${borrowerName}</small></p>
          ${book.borrower ? remainingTimeField : ""}
          <p class="card-text mb-2"><small><strong>Waiting:</strong> ${
            book.waitingList?.length || 0
          }</small></p>
          <div class="mt-auto d-flex justify-content-between">  
           ${
             isAdmin()
               ? `<button class="btn btn-warning btn-sm" onclick='openUpdateModal(${JSON.stringify(
                   book
                 )})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBook('${
              book._id
            }')">Delete</button>`
               : ""
           }
            <button class="btn btn-info btn-sm wait-btn" 
            onclick="toggleWait('${book._id}', ${isWaiting})">
            ${waitBtnText} </button>

          </div>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

async function toggleWait(bookId, isWaiting) {
  try {
    const booksToUsersAPI = "http://localhost:3001/booksToUsers";
    let endpoint = isWaiting
      ? `${booksToUsersAPI}/${bookId}/cancel-wait`
      : `${booksToUsersAPI}/${bookId}/waiting`;
    let res = await apiFetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getCurrentUserId() }),
    });

    let data = await res.json();
    if (!res.ok) alert(data.message || "Action failed");
    loadBooks();
  } catch (err) {
    console.error(err);
    alert("Error updating wait list");
  }
}
window.toggleWait = toggleWait;

// Delete book
async function deleteBook(id) {
  console.log("delete book");
  if (!confirm("Delete this book?")) return;
  await apiFetch(`${API}/${id}`, { method: "DELETE" });
  loadBooks();
}
window.deleteBook = deleteBook;

// Update book  (simple edit)
function openUpdateModal(book) {
  document.getElementById("updateBookId").value = book._id;
  document.getElementById("updateBookCategory").value = book.category;
  document.getElementById("updateBookLocation").value = book.location || "";

  const modal = new bootstrap.Modal(document.getElementById("updateBookModal"));
  modal.show();
}
window.openUpdateModal = openUpdateModal;

document
  .getElementById("updateBookForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("updateBookId").value;
    const formData = new FormData();
    formData.append(
      "category",
      document.getElementById("updateBookCategory").value
    );
    formData.append(
      "location",
      document.getElementById("updateBookLocation").value
    );

    const imageFile = document.getElementById("updateBookImage").files[0];
    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await apiFetch(`${API}/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update book");

      await loadBooks(); // Refresh book cards
      bootstrap.Modal.getInstance(
        document.getElementById("updateBookModal")
      ).hide();
    } catch (err) {
      alert("Error updating book: " + err.message);
    }
  });

// Add book
document.getElementById("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("add book");
  const formData = new FormData();
  formData.append("name", document.getElementById("bookName").value);
  formData.append("category", document.getElementById("bookCategory").value);
  formData.append("location", document.getElementById("bookLocation").value);
  const imageFile = document.getElementById("bookImage").files[0];
  if (imageFile) formData.append("image", imageFile);

  await apiFetch(API, { method: "POST", body: formData });
  bootstrap.Modal.getInstance(document.getElementById("addBookModal")).hide();
  e.target.reset();
  loadBooks();
});

// Load categories for combobox
async function loadCategories(selectedCategory = "All Categories") {
  const res = await apiFetch(`${API}/categories`);
  const categories = await res.json();

  const select = document.getElementById("filterCategorySelect");
  select.innerHTML = `<option value="All Categories">All Categories</option>`;

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  select.value = window.selectedCategory;
}

// Listen for changes in filters
function setupFilters() {
  const nameInput = document.getElementById("filterName");
  const categorySelect = document.getElementById("filterCategorySelect");
  const categoryText = document.getElementById("filterCategoryText");

  function applyFilters() {
    const name = nameInput.value.trim();
    const category = categoryText.value.trim() || categorySelect.value;
    window.selectedCategory = category;
    loadBooks(name, category);
  }

  nameInput.addEventListener("input", applyFilters);
  categoryText.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
}

//Listen to changes of the toggle
document.getElementById("toggleBorrowed").addEventListener("change", applyToggleFilters);
document.getElementById("toggleWaiting").addEventListener("change", applyToggleFilters);

async function applyToggleFilters() {
  const userId = getCurrentUserId();
  const showBorrowed = document.getElementById("toggleBorrowed").checked;
  const showWaiting = document.getElementById("toggleWaiting").checked;

  const res = await apiFetch(API);
  let books = await res.json();

  // If no filters → show all
  if (!showBorrowed && !showWaiting) {
    displayBooks(books);
    return;
  }

  let filtered = books;

  // Filter borrowed by user
  if (showBorrowed) {
    filtered = filtered.filter(b => b.borrower?.userId._id === userId);
  }

  // Filter user in waiting list
  if (showWaiting) {
    filtered = filtered.filter(b => b.waitingList?.includes(userId));
  }

  displayBooks(filtered);
}


// -------------------- Countdown updater (updates cells without refetching) --------------------
function updateCountdowns() {
  const cards = document.querySelectorAll(".book-card");

  cards.forEach((card) => {
    const endIso = card.dataset.endIso;
    const remSpan = card.querySelector(".remaining-value");

    if (remSpan) {
      remSpan.textContent = computeRemainingText(endIso);
    }
  });
}

// run countdown every second (no re-fetch)
setInterval(updateCountdowns, 1000);

//Add event listener for logout click event
document.getElementById("logoutBtn").addEventListener("click", () => {
logout();
});


// Init
window.onload = () => {
  console.log("isAdmin: " + isAdmin());
  hideToUser();
  loadCategories();
  loadBooks();
  setupFilters();
  checkTokenExpiration();
};
