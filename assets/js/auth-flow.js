import { auth, realtimeDb, onAuthStateChanged, ref, get } from "./firebase.js";

const ADMIN_EMAILS = [
    "admin@gmail.com",
    "admin@resq.com"
];

const PARTNER_EMAIL_PROFILES = {
    "starbuck@resq.com": {
        store_name: "Starbucks",
        owner_name: "Pengelola Starbucks",
        email: "starbuck@resq.com",
        role: "partner"
    }
};

const LOCAL_PARTNER_PROFILES_KEY = "resq_partner_profiles";

export function isAdminEmail(email) {
    return ADMIN_EMAILS.includes((email || "").trim().toLowerCase());
}

function getLocalPartnerProfile(email) {
    return PARTNER_EMAIL_PROFILES[(email || "").trim().toLowerCase()] || null;
}

function readLocalPartnerProfiles() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_PARTNER_PROFILES_KEY) || "{}");
    } catch (error) {
        console.error("Local partner profile read error:", error);
        return {};
    }
}

function getStoredPartnerProfile(user) {
    if (!user) return null;

    const profiles = readLocalPartnerProfiles();
    return profiles[user.uid] || profiles[(user.email || "").trim().toLowerCase()] || null;
}

export function saveLocalPartnerProfile(user, profile) {
    if (!user || !profile) return;

    const profiles = readLocalPartnerProfiles();
    const normalizedEmail = (user.email || profile.email || "").trim().toLowerCase();
    const nextProfile = {
        ...(profiles[user.uid] || {}),
        ...profile,
        id: user.uid,
        email: user.email || profile.email,
        role: "partner"
    };

    profiles[user.uid] = nextProfile;
    if (normalizedEmail) profiles[normalizedEmail] = nextProfile;
    localStorage.setItem(LOCAL_PARTNER_PROFILES_KEY, JSON.stringify(profiles));
}

export async function isPartnerAccount(user) {
    if (!user) return false;
    if (isAdminEmail(user.email)) return true;
    if (getLocalPartnerProfile(user.email)) return true;
    if (getStoredPartnerProfile(user)) return true;

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

    if (isAdminEmail(user.email)) {
        return {
            id: user.uid,
            store_name: "RESQ Mitra",
            owner_name: user.email?.split("@")[0] || "Mitra RESQ",
            email: user.email,
            is_system_admin: true
        };
    }

    try {
        const snapshot = await get(ref(realtimeDb, `partners/${user.uid}`));
        if (snapshot.exists()) {
            const profile = {
                id: user.uid,
                ...snapshot.val()
            };
            saveLocalPartnerProfile(user, profile);
            return {
                ...profile
            };
        }
    } catch (error) {
        console.error("Partner profile error:", error);
    }

    const storedProfile = getStoredPartnerProfile(user);
    if (storedProfile) {
        return {
            id: user.uid,
            ...storedProfile
        };
    }

    const localProfile = getLocalPartnerProfile(user.email);
    if (localProfile) {
        return {
            id: user.uid,
            ...localProfile
        };
    }

    return null;
}

export function isPartnerProfileComplete(profile) {
    if (!profile?.role && !profile?.is_system_admin) return false;
    if (profile.is_system_admin) return true;

    return Boolean(
        profile.logo_data &&
        profile.food_photo_data &&
        (
            profile.location?.lat && profile.location?.lng ||
            profile.latitude && profile.longitude
        )
    );
}

export async function getUserHomePage(user) {
    if (!await isPartnerAccount(user)) return "app.html";

    const profile = await getPartnerProfile(user);
    if (!isPartnerProfileComplete(profile)) return "partner-onboarding.html";

    // Specific redirect for requested emails
    const email = (user.email || "").trim().toLowerCase();
    if (email === "starbuck@resq.com" || email === "admin@gmail.com") {
        return "admin.html";
    }

    // Default to app.html for all other users to allow dual access.
    // Partners can switch to admin.html via the "Mitra" button.
    return "app.html";
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
