const API_USERS = "http://localhost:3001/users";

//Import functions from external file:
import {
  apiFetch,
  getCurrentUserId,
  isAdmin,
  checkTokenExpiration,
  logout
} from "./functions.js";

// Delete a user
async function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const res = await apiFetch(`${API_USERS}/${userId}`, { method: "DELETE" });
    if (res.ok) {
      alert("User deleted successfully!");
      loadUsers();
    } else {
      alert("Failed to delete user.");
    }
  } catch (err) {
    console.error("Error deleting user:", err);
  }
}

function openUpdateUser(user) {
  // Fill modal fields with selected user data
  document.getElementById("updateUserId").value = user._id;
  document.getElementById("updateFullName").value = user.fullName;
  document.getElementById("updateEmail").value = user.email;
  document.getElementById("updateCell").value = user.cell || "";
  document.getElementById("updateAddress").value = user.address || "";

  // Show the modal
  const updateModal = new bootstrap.Modal(
    document.getElementById("updateUserModal")
  );
  updateModal.show();
}

// Handle form submission
document.getElementById("updateUserForm").addEventListener("submit", async function (e) {
e.preventDefault();

    const id = document.getElementById("updateUserId").value;
    const updatedUser = {
      fullName: document.getElementById("updateFullName").value.trim(),
      email: document.getElementById("updateEmail").value.trim(),
      cell: document.getElementById("updateCell").value.trim(),
      address: document.getElementById("updateAddress").value.trim(),
    };

    try {
      const res = await apiFetch(`${API_USERS}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });

      if (res.ok) {
        alert("User updated successfully!");
        loadUsers(); // refresh table
        const modalEl = document.getElementById("updateUserModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide(); // close modal
      } else {
        const errorData = await res.json();
        alert(
          "Failed to update user: " + (errorData.message || "Unknown error")
        );
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  });

async function loadUsers(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const res = await apiFetch(`${API_USERS}/?${params}`);
  const users = await res.json();

  const tbody = document.getElementById("user-table-body");
  tbody.innerHTML = "";

  users.forEach((user, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${user.fullName}</td>
      <td>${user.id}</td>
      <td>${user.email}</td>
      <td>${user.cell || ""}</td>
      <td>${user.address || ""}</td>
      <td>
        <button class="btn btn-warning btn-sm me-2 update-btn" data-user='${JSON.stringify(user)}'>Update</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${user._id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add event listeners after row is added
  tbody.querySelectorAll(".update-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = JSON.parse(btn.dataset.user);
      openUpdateUser(user);
    });
  });

  tbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteUser(btn.dataset.id);
    });
  });
}

function setupUserTableFilters() {
  const filters = {
    fullName: document.getElementById("searchFullName"),
    id: document.getElementById("searchId"),
    email: document.getElementById("searchEmail"),
    cell: document.getElementById("searchCell"),
    address: document.getElementById("searchAddress"),
  };

  Object.values(filters).forEach((input) => {
    input.addEventListener("input", async () => {
      const query = {
        fullName: filters.fullName.value.trim(),
        id: filters.id.value.trim(),
        email: filters.email.value.trim(),
        cell: filters.cell.value.trim(),
        address: filters.address.value.trim(),
      };
      await loadUsers(query);
    });
  });
}

//Add event listener for logout click event
document.getElementById("logoutBtn").addEventListener("click", () => {
logout();
});

// Initialize
window.onload = async () => {
  await loadUsers();
  setupUserTableFilters();
  checkTokenExpiration();
};
