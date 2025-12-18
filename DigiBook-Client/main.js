const serverURL = "http://localhost:3001/users";

// Register (no JWT needed)
async function register() {
  const fullName = document.getElementById("regFullName").value.trim();
  const id = document.getElementById("regID").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const cell = document.getElementById("regCell").value.trim();
  const address = document.getElementById("regAddress").value.trim();
  const username = document.getElementById("regName").value.trim();
  const password = document.getElementById("regPass").value.trim();

  if (!fullName ||!id|| !email || !username || !password)
    return showOutput("Please fill in all required fields.", true);

  try {
    const res = await fetch(`${serverURL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName,id, email, cell, address, username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      showOutput(`✅ Register Success: ${data.message}`);
    } else {
      showOutput(`❌ Register Failed: ${data.error}`, true);
    }
  } catch (err) {
    showOutput(`Network Error: ${err.message}`, true);
  }
}

// Login (returns JWT)
async function login(redirect = false) {
  const username = document.getElementById("loginName").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  if (!username || !password)
    return showOutput("Please enter username and password.", true);

  try {
    const res = await fetch(`${serverURL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    console.log("data: " + data.token)

    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      showOutput(`✅ Login Success!`);

      if (redirect) {
        window.location.href = "pages/home_page.html"; // go to home page
      }
    } else {
      showOutput(`❌ Login Failed: ${data.error}`, true);
    }
  } catch (err) {
    showOutput(`Network Error: ${err.message}`, true);
  }
}

// Utility to show messages
function showOutput(msg, isError = false) {
  const output = document.getElementById("output");
  output.textContent = msg;
  output.style.color = isError ? "red" : "green";
}
