// functions.js

// Get token from localStorage
export function getToken() {
  return localStorage.getItem("token") || null;
}

// Decode JWT payload
function parseJwt(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

// Get current logged-in user's ID
export function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;

  const payload = parseJwt(token);
  return payload?.id || null; // use `id` because server signs {id, username}
}

// Check if user is admin
export function isAdmin() {
  const token = getToken();
  if (!token) return false;

  const payload = parseJwt(token);
  return payload?.role === "admin"; // adjust your admin check
}

// Check token expiration
export function checkTokenExpiration() {
  const token = getToken();
  if (!token) return;

  const payload = parseJwt(token);
  if (!payload?.exp) return;

  const now = Math.floor(Date.now() / 1000); // seconds
  if (payload.exp < now) {
    // Token expired
    alert("Session expired, please log in again.");
    localStorage.removeItem("token");
    window.location.href = "../index.html"; // redirect to login page
  }
}

// Logout - remove token and return to the login page
export function logout() {
  const token = getToken();

    alert("Logout in process");
    localStorage.removeItem("token");
    window.location.href = "../index.html"; // redirect to login page
  }

// Central fetch function that adds JWT automatically
export async function apiFetch(url, options = {}) {
  checkTokenExpiration();

  const token = getToken();
  const headers = options.headers || {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const finalOptions = { ...options, headers };
  return fetch(url, finalOptions);
}



export function computeRemainingText(endIso) {
  if (!endIso) return "-";
  const now = new Date();
  const end = new Date(endIso);
  const diffMs = end - now;
  if (isNaN(end) || diffMs < 0) return "Expired";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
