import { auth, googleProvider, signInWithEmailAndPassword, signInWithPopup } from "./firebase.js";
import { getUserHomePage, redirectWhenLoggedIn } from "./auth-flow.js";
import { byId, setError } from "./utils.js";

redirectWhenLoggedIn("app.html");

const emailInput = byId("email");
const passwordInput = byId("password");
const loginButton = byId("btn-login");
const googleLoginButton = byId("btn-google-login");
const errorText = byId("pesan-error");
const togglePassword = byId("toggle-password");

togglePassword?.addEventListener("click", () => {
    const icon = togglePassword.querySelector("i");
    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";
    icon.className = isHidden ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

loginButton?.addEventListener("click", async () => {
    loginButton.disabled = true;
    loginButton.innerText = "Memproses...";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        window.location.href = await getUserHomePage(userCredential.user);
    } catch (error) {
        setError(errorText, "Kredensial tidak valid. Silakan coba lagi.");
    } finally {
        loginButton.disabled = false;
        loginButton.innerText = "Login";
    }
});

googleLoginButton?.addEventListener("click", async () => {
    googleLoginButton.disabled = true;
    googleLoginButton.classList.add("opacity-70");

    try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        window.location.href = await getUserHomePage(userCredential.user);
    } catch (error) {
        console.error("Google login error:", error);
        setError(errorText, `Login Google gagal: ${error.code || "unknown-error"}`);
    } finally {
        googleLoginButton.disabled = false;
        googleLoginButton.classList.remove("opacity-70");
    }
});
