import { auth, googleProvider, realtimeDb, createUserWithEmailAndPassword, signInWithPopup, ref, set, serverTimestamp } from "./firebase.js";
import { getUserHomePage, redirectWhenLoggedIn, saveLocalPartnerProfile } from "./auth-flow.js";
import { byId, setError } from "./utils.js";

redirectWhenLoggedIn("app.html");

const nameInput = byId("reg-name");
const emailInput = byId("reg-email");
const passwordInput = byId("reg-password");
const storeNameInput = byId("reg-store-name");
const storePhoneInput = byId("reg-store-phone");
const storeAddressInput = byId("reg-store-address");
const partnerFields = byId("partner-fields");
const registerButton = byId("btn-register");
const googleRegisterButton = byId("btn-google-register");
const errorText = byId("pesan-error-reg");
const togglePassword = byId("toggle-reg-password");
const roleButtons = document.querySelectorAll("[data-role-option]");

let selectedRole = new URLSearchParams(window.location.search).get("role") === "partner" ? "partner" : "customer";

roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedRole = button.dataset.roleOption;
        updateRoleUI();
    });
});

updateRoleUI();

togglePassword?.addEventListener("click", () => {
    const icon = togglePassword.querySelector("i");
    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";
    icon.className = isHidden ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

registerButton?.addEventListener("click", async () => {
    registerButton.disabled = true;
    registerButton.innerText = "Memproses...";

    try {
        validateRegistration();
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        await savePartnerProfile(userCredential.user);
        window.location.href = selectedRole === "partner" ? "partner-onboarding.html" : await getUserHomePage(userCredential.user);
    } catch (error) {
        console.error("Register error:", error);
        const message = error.message === "partner-profile-incomplete"
            ? "Lengkapi nama toko, nomor telepon, dan alamat toko untuk akun mitra."
            : "Gagal membuat akun. Pastikan email valid dan password minimal 6 karakter.";
        setError(errorText, message);
    } finally {
        registerButton.disabled = false;
        registerButton.innerText = "Create account";
    }
});

googleRegisterButton?.addEventListener("click", async () => {
    googleRegisterButton.disabled = true;
    googleRegisterButton.classList.add("opacity-70");

    try {
        validateRegistration();
        const userCredential = await signInWithPopup(auth, googleProvider);
        await savePartnerProfile(userCredential.user);
        window.location.href = selectedRole === "partner" ? "partner-onboarding.html" : await getUserHomePage(userCredential.user);
    } catch (error) {
        console.error("Google login error:", error);
        setError(errorText, `Login Google gagal: ${error.code || "unknown-error"}`);
    } finally {
        googleRegisterButton.disabled = false;
        googleRegisterButton.classList.remove("opacity-70");
    }
});

function updateRoleUI() {
    roleButtons.forEach((button) => {
        const isActive = button.dataset.roleOption === selectedRole;
        button.classList.toggle("bg-white", isActive);
        button.classList.toggle("text-slate-900", isActive);
        button.classList.toggle("shadow-sm", isActive);
        button.classList.toggle("text-slate-500", !isActive);
    });

    partnerFields?.classList.toggle("hidden", selectedRole !== "partner");
}

function validateRegistration() {
    if (selectedRole !== "partner") return;

    if (!storeNameInput.value.trim() || !storePhoneInput.value.trim() || !storeAddressInput.value.trim()) {
        throw new Error("partner-profile-incomplete");
    }
}

async function savePartnerProfile(user) {
    if (selectedRole !== "partner") return;

    const profile = {
        owner_name: nameInput.value.trim() || user.displayName || user.email.split("@")[0],
        store_name: storeNameInput.value.trim(),
        phone: storePhoneInput.value.trim(),
        address: storeAddressInput.value.trim(),
        email: user.email,
        role: "partner",
        profile_completed: false,
        created_at: serverTimestamp()
    };

    saveLocalPartnerProfile(user, profile);

    try {
        await set(ref(realtimeDb, `partners/${user.uid}`), profile);
    } catch (error) {
        console.warn("Partner profile saved locally because Firebase write failed:", error);
    }
}
