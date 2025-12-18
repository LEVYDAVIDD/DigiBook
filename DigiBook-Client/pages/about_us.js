//Import functions from external file:
import { isAdmin, logout } from './functions.js'

async function hideToUser() {
  try {
    let elementsNotForUser = document.getElementsByClassName("hideToUser");
    if (!isAdmin()) {

      for (let e of elementsNotForUser) {
        e.hidden = true;
      }
    }
  } catch (err) {
    alert("Error : " + err.message);
  }
}

//Add event listener for logout click event
document.getElementById("logoutBtn").addEventListener("click", () => {
logout();
});

// Init
window.onload = () => {
  console.log("isAdmin: " + isAdmin());
  hideToUser();
};

