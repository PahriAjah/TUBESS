import { auth, onAuthStateChanged } from "./firebase.js";
import { getUserHomePage } from "./auth-flow.js";

const appLinks = document.querySelectorAll("[data-app-link]");

onAuthStateChanged(auth, async (user) => {
    const destination = user ? await getUserHomePage(user) : "login.html";

    appLinks.forEach((link) => {
        link.href = destination;
        link.textContent = user ? "Buka Aplikasi" : link.dataset.guestLabel || "Mulai Sekarang";
    });
});
