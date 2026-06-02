import { auth, realtimeDb, signOut, ref, get, push, serverTimestamp } from "./firebase.js";
import { requireAuth } from "./auth-flow.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

const menuContainer = byId("daftar-menu");
const profile = byId("profil-user");
const userName = byId("nama-user");
const logoutButton = byId("btn-logout");
const modal = byId("modal-checkout");
const modalName = byId("modal-nama-menu");
const modalPrice = byId("modal-harga");
const paymentMethod = byId("metode-pembayaran");
const confirmButton = byId("btn-konfirmasi");

let selectedMenu = null;
let userEmail = "Guest";

requireAuth((user) => {
    userEmail = user.email;
    userName.innerText = "Halo, " + user.email.split("@")[0] + "!";
    profile.classList.remove("hidden");
    profile.classList.add("flex");
    loadMenus();
});

logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});

menuContainer?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order]");
    if (!button) return;

    selectedMenu = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        restaurantId: button.dataset.restaurantId,
        partnerUid: button.dataset.partnerUid || ""
    };

    modalName.innerText = selectedMenu.name;
    modalPrice.innerText = formatRupiah(selectedMenu.price);
    openModal();
});

byId("btn-batal")?.addEventListener("click", closeModal);

confirmButton?.addEventListener("click", async () => {
    if (!selectedMenu) return;

    confirmButton.innerText = "Memproses...";
    confirmButton.disabled = true;

    const pickupCode = "RESQ-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    try {
        await push(ref(realtimeDb, "orders"), {
            product_name: selectedMenu.name,
            product_id: selectedMenu.id,
            restaurant_id: selectedMenu.restaurantId,
            partner_uid: selectedMenu.partnerUid,
            total_price: selectedMenu.price,
            payment_method: paymentMethod.value,
            pickup_code: pickupCode,
            customer_email: userEmail,
            status: "Menunggu Pengambilan",
            timestamp: serverTimestamp()
        });

        alert(`Pesanan Berhasil!\nKode: ${pickupCode}`);
        closeModal();
    } catch (error) {
        alert("Gagal memproses pesanan.");
    } finally {
        confirmButton.innerText = "Bayar Sekarang";
        confirmButton.disabled = false;
    }
});

async function loadMenus() {
    try {
        const snapshot = await get(ref(realtimeDb, "menus"));
        const cards = [];

        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            cards.push(menuCard({
                id: childSnapshot.key,
                name: item.name,
                stock: item.stock,
                price: item.surplus_price,
                restaurantId: item.restaurant_id,
                partnerUid: item.partner_uid || ""
            }));
        });

        menuContainer.innerHTML = cards.length ? cards.join("") : emptyState("Belum ada menu surplus tersedia.");
    } catch (error) {
        console.error("Error:", error);
        menuContainer.innerHTML = emptyState("Gagal memuat menu. Silakan coba lagi nanti.");
    }
}

function menuCard(item) {
    return `
        <article class="flex min-h-[250px] flex-col justify-between rounded-[26px] bg-white p-5 text-resqNavy shadow-lg shadow-slate-950/10">
            <div>
                <div class="mb-4 flex h-28 items-center justify-center rounded-3xl bg-[#fff8d7]">
                    <img src="./assets/burger-signin.png" alt="${escapeHtml(item.name)}" class="h-24 w-full object-contain">
                </div>
                <h3 class="text-lg font-black text-resqBlue">${escapeHtml(item.name)}</h3>
                <p class="mt-2 text-xs font-bold text-slate-400">Sisa Porsi: ${escapeHtml(item.stock)}</p>
            </div>
            <div class="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span class="text-base font-black text-resqBlue">${formatRupiah(item.price)}</span>
                <button
                    data-order
                    data-id="${escapeHtml(item.id)}"
                    data-name="${escapeHtml(item.name)}"
                    data-price="${Number(item.price) || 0}"
                    data-restaurant-id="${escapeHtml(item.restaurantId)}"
                    data-partner-uid="${escapeHtml(item.partnerUid)}"
                    class="rounded-full bg-resqYellow px-5 py-2.5 text-xs font-black text-resqNavy transition hover:bg-yellow-400">
                    Pesan
                </button>
            </div>
        </article>
    `;
}

function emptyState(message) {
    return `
        <p class="rounded-3xl bg-white/10 px-6 py-12 text-center text-sm font-semibold text-white/70 sm:col-span-2 lg:col-span-3">
            ${message}
        </p>
    `;
}

function openModal() {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    selectedMenu = null;
}
