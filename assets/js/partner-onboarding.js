import { auth, realtimeDb, onAuthStateChanged, ref, update, signOut, serverTimestamp } from "./firebase.js";
import { getPartnerProfile, isPartnerAccount, isPartnerProfileComplete, saveLocalPartnerProfile } from "./auth-flow.js";
import { byId, setError } from "./utils.js";

const logoInput = byId("partner-logo");
const foodPhotoInput = byId("partner-food-photo");
const logoPreview = byId("logo-preview");
const foodPreview = byId("food-preview");
const addressInput = byId("partner-address");
const useLocationButton = byId("btn-use-location");
const saveButton = byId("btn-save-partner-profile");
const logoutButton = byId("btn-logout-onboarding");
const errorText = byId("partner-onboarding-error");
const locationStatus = byId("location-status");

let currentUser = null;
let logoData = "";
let foodPhotoData = "";
let selectedLocation = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!await isPartnerAccount(user)) {
        window.location.href = "app.html";
        return;
    }

    currentUser = user;
    const profile = await getPartnerProfile(user);
    if (isPartnerProfileComplete(profile)) {
        window.location.href = "admin.html";
        return;
    }

    hydrateExistingProfile(profile);
    window.lucide?.createIcons();
});

logoInput?.addEventListener("change", async () => {
    logoData = await readImageAsDataUrl(logoInput.files?.[0]);
    showPreview(logoPreview, logoData);
});

foodPhotoInput?.addEventListener("change", async () => {
    foodPhotoData = await readImageAsDataUrl(foodPhotoInput.files?.[0]);
    showPreview(foodPreview, foodPhotoData);
});

useLocationButton?.addEventListener("click", () => {
    if (!navigator.geolocation) {
        setError(errorText, "Browser tidak mendukung geolocation. Gunakan browser lain untuk mengambil lokasi toko.");
        return;
    }

    useLocationButton.disabled = true;
    useLocationButton.innerText = "Mengambil lokasi...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            selectedLocation = {
                lat: Number(position.coords.latitude.toFixed(6)),
                lng: Number(position.coords.longitude.toFixed(6))
            };
            updateLocationStatus();
            useLocationButton.disabled = false;
            useLocationButton.innerHTML = `<i data-lucide="map-pin" class="h-4 w-4"></i> Gunakan lokasi saya`;
            window.lucide?.createIcons();
        },
        () => {
            setError(errorText, "Gagal mengambil lokasi. Pastikan izin lokasi aktif atau isi manual.");
            useLocationButton.disabled = false;
            useLocationButton.innerHTML = `<i data-lucide="map-pin" class="h-4 w-4"></i> Gunakan lokasi saya`;
            window.lucide?.createIcons();
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

saveButton?.addEventListener("click", async () => {
    if (!currentUser) return;

    saveButton.disabled = true;
    saveButton.innerText = "Menyimpan...";
    errorText?.classList.add("hidden");

    try {
        validatePartnerSetup();
        const profileUpdate = {
            logo_data: logoData,
            food_photo_data: foodPhotoData,
            address: addressInput.value.trim(),
            location: {
                lat: selectedLocation.lat,
                lng: selectedLocation.lng
            },
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            profile_completed: true,
            profile_completed_at: serverTimestamp()
        };

        saveLocalPartnerProfile(currentUser, profileUpdate);

        try {
            await update(ref(realtimeDb, `partners/${currentUser.uid}`), profileUpdate);
        } catch (error) {
            console.warn("Partner onboarding saved locally because Firebase write failed:", error);
        }

        window.location.href = "admin.html";
    } catch (error) {
        console.error("Partner onboarding error:", error);
        setError(errorText, error.message || "Gagal menyimpan profil mitra.");
    } finally {
        saveButton.disabled = false;
        saveButton.innerText = "Simpan dan masuk dashboard";
    }
});

logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});

function hydrateExistingProfile(profile) {
    if (!profile) return;

    addressInput.value = profile.address || "";
    const lat = profile.location?.lat || profile.latitude;
    const lng = profile.location?.lng || profile.longitude;
    selectedLocation = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
    updateLocationStatus();

    logoData = profile.logo_data || "";
    foodPhotoData = profile.food_photo_data || "";
    showPreview(logoPreview, logoData);
    showPreview(foodPreview, foodPhotoData);
}

function validatePartnerSetup() {
    if (!logoData) throw new Error("Logo toko wajib diunggah.");
    if (!foodPhotoData) throw new Error("Foto makanan wajib diunggah.");
    if (!addressInput.value.trim()) throw new Error("Alamat pickup wajib diisi.");
    if (!selectedLocation?.lat || !selectedLocation?.lng) throw new Error("Lokasi toko wajib diambil dengan tombol lokasi.");
}

function updateLocationStatus() {
    if (!locationStatus) return;

    if (!selectedLocation) {
        locationStatus.innerText = "Lokasi belum diambil.";
        locationStatus.className = "mt-4 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-500";
        return;
    }

    locationStatus.innerText = "Lokasi toko sudah diambil.";
    locationStatus.className = "mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700";
}

function showPreview(image, src) {
    if (!image || !src) return;
    image.src = src;
    image.classList.remove("hidden");
}

async function readImageAsDataUrl(file) {
    if (!file) return "";
    if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");

    const imageUrl = URL.createObjectURL(file);
    const image = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);

    const canvas = document.createElement("canvas");
    const maxSize = 900;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}
