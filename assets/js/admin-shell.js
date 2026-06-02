import { auth, signOut } from "./firebase.js";
import { getPartnerProfile, isPartnerAccount, requireAuth } from "./auth-flow.js";
import { byId } from "./utils.js";

export function initAdminPage(pageKey, onReady) {
    setupActiveNavigation(pageKey);
    setupLogout();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    requireAuth(async (user) => {
        if (!await isPartnerAccount(user)) {
            window.location.href = "app.html";
            return;
        }

        const partnerProfile = await getPartnerProfile(user);
        renderPartnerProfile(partnerProfile);
        await onReady(user, partnerProfile);
    });
}

function setupActiveNavigation(pageKey) {
    document.querySelectorAll("[data-admin-nav]").forEach((link) => {
        const isActive = link.dataset.adminNav === pageKey;

        link.classList.toggle("bg-slate-200", isActive);
        link.classList.toggle("text-resqBlue", isActive);
        link.classList.toggle("text-slate-600", !isActive);

        if (!isActive) {
            link.classList.add("hover:bg-slate-100");
        }
    });
}

function setupLogout() {
    byId("btn-logout")?.addEventListener("click", logout);
    byId("btn-logout-side")?.addEventListener("click", logout);
}

async function logout() {
    await signOut(auth);
    window.location.href = "index.html";
}

function renderPartnerProfile(profile) {
    const storeName = profile?.store_name || profile?.storeName || "Nama Toko";

    document.querySelectorAll("[data-partner-store-name]").forEach((element) => {
        element.innerText = storeName;
    });
}
