// borrowing_book.js
const API_BOOKS = "http://localhost:3001/booksToUsers";
const API_USERS = "http://localhost:3001/booksToUsers/search";

//Import functions from external file:
import { apiFetch, isAdmin, checkTokenExpiration, computeRemainingText, logout } from "./functions.js";

let selectedUser = null; // selected user from search
let borrowBookId = null; // bookId selected for borrow
let booksCache = [];     // last fetched books (used for countdown updates)

// -------------------- Load Books (fetch + render) --------------------
async function loadBooks() {
  try {
    const res = await apiFetch(API_BOOKS);
    if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
    const books = await res.json();

    booksCache = books; // store for countdown updates
    renderBooks(books);
  } catch (err) {
    console.error("Failed to load books:", err);
  }
}

// -------------------- Render books into table --------------------
function renderBooks(books) {
  const tbody = document.getElementById("book-table-body");
  tbody.innerHTML = "";

  books.forEach((book, index) => {
    // Safe borrower extraction (book.borrower may be null or malformed)
    let borrowerName = "None";
    let borrowerObj = null;
    let endIso = null;

    if (book.borrower && book.borrower.userId) {
      borrowerObj = book.borrower.userId; // expected populated user object
      const full = borrowerObj.fullName || "Unknown";
      const id = borrowerObj.id ?? "-";
      borrowerName = `${full} (${id})`;
      if (book.borrower.endDate) endIso = book.borrower.endDate;
    }

    // waiting names (server returns waitingNames string already)
    const waitingNames = book.waitingNames ?? "None";

    // initial remaining time string (will be updated by countdown tick)
    const remainingText = computeRemainingText(endIso);

    // data-borrower contains borrower._id (user id) and fullName for return logic
    const dataBorrower = borrowerObj ? { _id: borrowerObj._id ?? borrowerObj._id, fullName: borrowerObj.fullName ?? "" } : null;

    const tr = document.createElement("tr");
    tr.dataset.bookId = book._id;
    if (endIso) tr.dataset.endIso = endIso; // used by countdown updater
    else tr.dataset.endIso = "";
    console.log(book)
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${book.id}</td>
      <td>${escapeHtml(book.name)}</td>
      <td>${escapeHtml(book.category)}</td>
      <td class="borrower-cell">${escapeHtml(borrowerName)}</td>
      <td class="remaining-cell">${escapeHtml(remainingText)}</td>
      <td class="waiting-cell">${escapeHtml(waitingNames)}</td>
      <td class="action-cell">
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm borrow-btn" data-id="${book._id}">Borrow</button>
          <button class="btn btn-warning btn-sm waiting-btn" data-id="${book._id}">Waiting</button>
          <button class="btn btn-danger btn-sm return-btn" data-id="${book._id}" data-borrower='${dataBorrower ? JSON.stringify(dataBorrower) : ""}'>Return</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachBookEventHandlers();
  // update countdown immediately (so UI doesn't wait 1s)
  updateCountdowns();
}

// -------------------- Safe HTML escape --------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}



// -------------------- Attach events to buttons after render --------------------
function attachBookEventHandlers() {
  document.querySelectorAll(".borrow-btn").forEach(btn => {
    btn.removeEventListener("click", borrowBtnHandler);
    btn.addEventListener("click", borrowBtnHandler);
  });

  document.querySelectorAll(".waiting-btn").forEach(btn => {
    btn.removeEventListener("click", waitingBtnHandler);
    btn.addEventListener("click", waitingBtnHandler);
  });

  document.querySelectorAll(".return-btn").forEach(btn => {
    btn.removeEventListener("click", returnBtnHandler);
    btn.addEventListener("click", returnBtnHandler);
  });
}

function borrowBtnHandler(e) {
  const bookId = e.currentTarget.dataset.id;
  openBorrowModal(bookId);
}

function waitingBtnHandler(e) {
  const bookId = e.currentTarget.dataset.id;
  handleJoinWaiting(bookId);
}

function returnBtnHandler(e) {
  const bookId = e.currentTarget.dataset.id;
  const borrowerStr = e.currentTarget.dataset.borrower;
  handleReturnBook(bookId, borrowerStr);
}

// -------------------- Search User --------------------
async function searchUser() {
  const input = document.getElementById("search-input").value.trim();
  const resultDiv = document.getElementById("search-result");
  resultDiv.innerHTML = "";

  if (!input) {
    selectedUser = null;
    return alert("Enter user ID or name");
  }

  try {
    const res = await apiFetch(`${API_USERS}?id=${encodeURIComponent(input)}&fullName=${encodeURIComponent(input)}`);
    if (!res.ok) {
      throw new Error(`Search failed: ${res.status}`);
    }
    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      resultDiv.innerHTML = `<p class="text-danger">No users found</p>`;
      selectedUser = null;
      return;
    }

    selectedUser = users[0];
    resultDiv.innerHTML = `
      <div class="alert alert-success">
        Found: <strong>${escapeHtml(selectedUser.fullName)}</strong> (ID: ${escapeHtml(selectedUser.id)})
      </div>
    `;
  } catch (err) {
    console.error("Search failed:", err);
    resultDiv.innerHTML = `<p class="text-danger">Search failed</p>`;
    selectedUser = null;
  }
}

// -------------------- Open Borrow Modal --------------------
function openBorrowModal(bookId) {
  if (!selectedUser) return alert("Search and select a user first.");
  borrowBookId = bookId;

  const userInput = document.getElementById("borrowUserName");
  const startInput = document.getElementById("borrowStartDate");
  const endInput = document.getElementById("borrowEndDate");

  userInput.value = `${selectedUser.fullName} (${selectedUser.id})`;

  // default start = now (local datetime-local format)
  const nowLocal = new Date();
  startInput.value = nowLocal.toISOString().slice(0,16);

  // default end = +7 days
  const weekLocal = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,16);
  endInput.value = weekLocal;

  new bootstrap.Modal(document.getElementById("borrowModal")).show();
}

// -------------------- Confirm Borrow (modal Confirm) --------------------
document.getElementById("confirmBorrowBtn").addEventListener("click", async () => {
  const start = document.getElementById("borrowStartDate").value;
  const end = document.getElementById("borrowEndDate").value;

  if (!start || !end) return alert("Select both start and end date.");

  // convert to ISO acceptable by server (datetime-local gives local without timezone)
  const startIso = toIsoFromDatetimeLocal(start);
  const endIso = toIsoFromDatetimeLocal(end);

  try {
    const res = await apiFetch(`${API_BOOKS}/${borrowBookId}/borrow`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUser._id,
        startDate: startIso,
        endDate: endIso
      })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Borrow failed");

    bootstrap.Modal.getInstance(document.getElementById("borrowModal")).hide();
    await loadBooks();
  } catch (err) {
    console.error("Borrow failed:", err);
    alert("Borrow failed, see console.");
  }
});

// helper: convert "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DDTHH:MM:SS" (ISO)
function toIsoFromDatetimeLocal(localValue) {
  // localValue is e.g. "2026-11-11T11:11"
  // Append seconds to make it valid ISO with seconds
  if (!localValue) return null;
  return `${localValue}:00`;
}

// -------------------- Waiting List --------------------
async function handleJoinWaiting(bookId) {
  if (!selectedUser) return alert("Search and select a user first.");

  try {
    const res = await apiFetch(`${API_BOOKS}/${bookId}/waiting`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser._id })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Failed to add to waiting list");
    await loadBooks();
  } catch (err) {
    console.error("Waiting list add failed:", err);
    alert("Failed to add to waiting list");
  }
}

// -------------------- Return Book --------------------
async function handleReturnBook(bookId, borrowerStr) {
  if (!borrowerStr) return alert("This book is not borrowed.");

  let borrower;
  try {
    borrower = borrowerStr ? JSON.parse(borrowerStr) : null;
  } catch {
    borrower = null;
  }

  if (!borrower || !borrower._id) return alert("Invalid borrower data.");

  try {
    const res = await apiFetch(`${API_BOOKS}/${bookId}/return`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: borrower._id })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Return failed");
    await loadBooks();
  } catch (err) {
    console.error("Return failed:", err);
    alert("Return failed");
  }
}

// -------------------- Countdown updater (updates cells without refetching) --------------------
function updateCountdowns() {
  const rows = document.querySelectorAll("#book-table-body tr");
  rows.forEach(row => {
    const endIso = row.dataset.endIso;
    const remCell = row.querySelector(".remaining-cell");
    if (!endIso) {
      remCell.textContent = "-";
      return;
    }
    const text = computeRemainingText(endIso);
    remCell.textContent = text;
  });
}

// run countdown every second (no re-fetch)
setInterval(updateCountdowns, 1000);

//Add event listener for logout click event
document.getElementById("logoutBtn").addEventListener("click", () => {
logout();
});

// -------------------- Init --------------------
window.onload = () => {
  document.getElementById("search-btn").addEventListener("click", searchUser);
  loadBooks();
  checkTokenExpiration();
};
