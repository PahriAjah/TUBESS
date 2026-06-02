import { auth, realtimeDb, onAuthStateChanged, ref, get } from "./firebase.js";

const ADMIN_EMAILS = [
    "admin@gmail.com",
    "admin@resq.com"
];

export function isAdminEmail(email) {
    return ADMIN_EMAILS.includes((email || "").trim().toLowerCase());
}

export async function isPartnerAccount(user) {
    if (!user) return false;
    if (isAdminEmail(user.email)) return true;

    try {
        const snapshot = await get(ref(realtimeDb, `partners/${user.uid}`));
        return snapshot.exists();
    } catch (error) {
        console.error("Partner role check error:", error);
        return false;
    }
}

export async function getPartnerProfile(user) {
    if (!user) return null;

    try {
        const snapshot = await get(ref(realtimeDb, `partners/${user.uid}`));
        if (snapshot.exists()) {
            return {
                id: user.uid,
                ...snapshot.val()
            };
        }
    } catch (error) {
        console.error("Partner profile error:", error);
    }

    if (isAdminEmail(user.email)) {
        return {
            id: user.uid,
            store_name: "RESQ Mitra",
            owner_name: user.email?.split("@")[0] || "Mitra RESQ",
            email: user.email,
            is_system_admin: true
        };
    }

    return null;
}

export async function getUserHomePage(user) {
    return await isPartnerAccount(user) ? "admin.html" : "app.html";
}

export function redirectWhenLoggedIn(target = "app.html") {
    onAuthStateChanged(auth, async (user) => {
        if (user) window.location.href = target === "app.html" ? await getUserHomePage(user) : target;
    });
}

export function requireAuth(onSignedIn, fallback = "login.html") {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = fallback;
            return;
        }

        onSignedIn(user);
    });
}
