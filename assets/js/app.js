import { auth, realtimeDb, signOut, ref, get, push, serverTimestamp } from "./firebase.js";
import { isPartnerAccount, requireAuth } from "./auth-flow.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

const menuContainer = byId("daftar-menu");
const profile = byId("profil-user");
const userName = byId("nama-user");
const userEmailLabel = byId("email-user");
const userInitial = byId("user-initial");
const logoutButton = byId("btn-logout");
const searchInput = byId("input-cari");
const categoryFilter = byId("filter-kategori");
const stockFilter = byId("filter-stok");
const resetFilterButton = byId("btn-reset-filter");
const resultCount = byId("jumlah-hasil");
const totalMenuStat = byId("stat-menu");
const totalStockStat = byId("stat-stock");
const totalOrdersStat = byId("stat-orders");
const savedFoodStat = byId("stat-saved");
const readyOrdersStat = byId("stat-ready");
const orderList = byId("daftar-pesanan");
const latestMenuContainer = byId("latest-menu");
const recommendationContainer = byId("rekomendasi-menu");
const profileNameInput = byId("profile-name");
const profileEmailInput = byId("profile-email");

const emptySummary = byId("ringkasan-kosong");
const orderSummary = byId("ringkasan-pesanan");
const selectedBadge = byId("selected-badge");
const summaryImage = byId("summary-image");
const summaryPartner = byId("summary-partner");
const summaryName = byId("summary-name");
const summaryPrice = byId("summary-price");
const openCheckoutButton = byId("btn-open-checkout");

const modal = byId("modal-checkout");
const modalPartner = byId("modal-partner");
const modalName = byId("modal-nama-menu");
const modalPrice = byId("modal-harga");
const paymentMethod = byId("metode-pembayaran");
const confirmButton = byId("btn-konfirmasi");
const qrisDemoPanel = byId("qris-demo-panel");
const qrisDemoImage = byId("qris-demo-image");
const qrisDemoAmount = byId("qris-demo-amount");
const toast = byId("toast");
const toastTitle = byId("toast-title");
const toastMessage = byId("toast-message");

const modalUlasan = byId("modal-ulasan");
const btnTutupUlasan = byId("btn-tutup-ulasan");
const btnKirimUlasan = byId("btn-kirim-ulasan");
const ratingStars = document.querySelectorAll("#rating-stars button");
const ulasanTeks = byId("ulasan-teks");

let selectedMenu = null;
let userEmail = "Guest";
let menus = [];
let userOrders = [];
let toastTimer = null;
let resqMap = null;
let favoriteIds = new Set();

requireAuth(async (user) => {
    if (await isPartnerAccount(user)) {
        window.location.href = "admin.html";
        return;
    }

    userEmail = user.email;
    const displayName = user.email.split("@")[0];
    userName.innerText = displayName;
    userEmailLabel.innerText = user.email;
    userInitial.innerText = displayName.charAt(0).toUpperCase();
    if (profileNameInput) profileNameInput.value = displayName;
    if (profileEmailInput) profileEmailInput.value = user.email;
    profile.classList.remove("hidden");
    profile.classList.add("flex");

    await Promise.all([loadMenus(), loadOrders()]);
    updateStats();
    window.lucide?.createIcons();
});

logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});

searchInput?.addEventListener("input", renderMenus);
categoryFilter?.addEventListener("change", renderMenus);
stockFilter?.addEventListener("change", renderMenus);

resetFilterButton?.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    stockFilter.value = "all";
    renderMenus();
});

[menuContainer, latestMenuContainer].forEach((container) => container?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order]");
    if (!button) return;

    const item = menus.find((menu) => menu.id === button.dataset.id);
    if (!item) return;

    selectMenu(item);
    activateScreen("pesanan");
}));

document.querySelectorAll(".app-nav").forEach((button) => {
    button.addEventListener("click", () => activateScreen(button.dataset.target));
});

byId("mobile-menu-toggle")?.addEventListener("click", () => {
    byId("mobile-menu")?.classList.toggle("hidden");
    byId("mobile-menu")?.classList.toggle("flex");
    window.lucide?.createIcons();
});

byId("btn-save-profile")?.addEventListener("click", () => {
    const name = profileNameInput?.value?.trim() || userEmail.split("@")[0];
    userName.innerText = name;
    userInitial.innerText = name.charAt(0).toUpperCase();
    showToast("Profil diperbarui", "Perubahan profil disimpan di tampilan ini.");
});

byId("btn-change-password")?.addEventListener("click", () => {
    showToast("Perubahan kata sandi", "Demo tampilan berhasil dijalankan.");
});

openCheckoutButton?.addEventListener("click", openModal);
byId("btn-batal")?.addEventListener("click", closeModal);
paymentMethod?.addEventListener("change", updatePaymentPreview);

modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
});

document.addEventListener("click", (event) => {
    const btnFav = event.target.closest("[data-favorite]");
    if (btnFav) {
        event.stopPropagation();
        const id = btnFav.dataset.favorite;
        if (favoriteIds.has(id)) {
            favoriteIds.delete(id);
            showToast("Favorit", "Dihapus dari favorit.");
        } else {
            favoriteIds.add(id);
            showToast("Favorit", "Ditambahkan ke favorit.");
        }
        renderMenus();
        renderDashboardMenus();
        renderFavorites();
        return;
    }

    const btnUlasan = event.target.closest("[data-ulasan]");
    if (btnUlasan) {
        modalUlasan?.classList.remove("hidden");
        modalUlasan?.classList.add("flex");
        return;
    }
});

btnTutupUlasan?.addEventListener("click", () => {
    modalUlasan?.classList.add("hidden");
    modalUlasan?.classList.remove("flex");
});

let currentRating = 0;
ratingStars?.forEach((star, index) => {
    star.addEventListener("click", () => {
        currentRating = index + 1;
        ratingStars.forEach((s, i) => {
            s.classList.toggle("text-resqYellow", i < currentRating);
            s.classList.toggle("text-slate-300", i >= currentRating);
            s.querySelector("svg")?.classList.toggle("fill-current", i < currentRating);
        });
    });
});

btnKirimUlasan?.addEventListener("click", () => {
    modalUlasan?.classList.add("hidden");
    modalUlasan?.classList.remove("flex");
    showToast("Ulasan Terkirim", "Terima kasih atas ulasannya!");
    if (ulasanTeks) ulasanTeks.value = "";
    currentRating = 0;
    ratingStars?.forEach(s => {
        s.classList.remove("text-resqYellow");
        s.classList.add("text-slate-300");
        s.querySelector("svg")?.classList.remove("fill-current");
    });
});

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
            payment_demo: paymentMethod.value === "QRIS",
            pickup_code: pickupCode,
            customer_email: userEmail,
            status: "Diproses",
            timestamp: serverTimestamp()
        });

        closeModal();
        clearSelection();
        await loadOrders();
        showToast(
            paymentMethod.value === "QRIS" ? "Pembayaran QRIS demo berhasil" : "Pesanan berhasil dibuat",
            `Kode pickup: ${pickupCode}`
        );
    } catch (error) {
        console.error("Order error:", error);
        showToast("Gagal memproses pesanan", "Silakan coba lagi dalam beberapa saat.");
    } finally {
        confirmButton.innerText = "Buat Pesanan";
        confirmButton.disabled = false;
    }
});

async function loadMenus() {
    try {
        const snapshot = await get(ref(realtimeDb, "menus"));
        menus = [];

        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            menus.push({
                id: childSnapshot.key,
                name: item.name || "Menu RESQ",
                stock: Number(item.stock) || 0,
                price: Number(item.surplus_price) || 0,
                restaurantId: item.restaurant_id || "Partner RESQ",
                category: normalizeCategory(item.category || item.kategori || item.type || item.name),
                imageUrl: item.image_url || item.imageUrl || "./assets/burger-signin.png",
                partnerUid: item.partner_uid || ""
            });
        });

        updateStats();
        renderMenus();
        renderDashboardMenus();
    } catch (error) {
        console.error("Menu error:", error);
        menuContainer.innerHTML = emptyState("Gagal memuat menu. Silakan coba lagi nanti.");
        resultCount.innerText = "Gagal memuat";
        latestMenuContainer.innerHTML = emptyState("Gagal memuat makanan terbaru.");
        recommendationContainer.innerHTML = emptyState("Gagal memuat rekomendasi.");
    }
}

async function loadOrders() {
    try {
        const snapshot = await get(ref(realtimeDb, "orders"));
        const orders = [];

        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            if (item.customer_email === userEmail) {
                orders.push({
                    id: childSnapshot.key,
                    name: item.product_name || "Pesanan RESQ",
                    price: Number(item.total_price) || 0,
                    method: item.payment_method || "-",
                    code: item.pickup_code || "-",
                    status: normalizeOrderStatus(item.status || "Diproses"),
                    timestamp: item.timestamp || 0
                });
            }
        });

        orders.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        userOrders = orders;
        renderOrders(orders);
        updateStats();
    } catch (error) {
        console.error("Order load error:", error);
        orderList.innerHTML = `<p class="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">Gagal memuat riwayat pesanan.</p>`;
    }
}

function renderMenus() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = stockFilter.value;
    const category = categoryFilter?.value || "all";

    const filteredMenus = menus.filter((item) => {
        const matchesQuery = `${item.name} ${item.restaurantId} ${item.category}`.toLowerCase().includes(query);
        const matchesCategory = category === "all" || item.category === category;
        const matchesStock =
            filter === "all" ||
            (filter === "available" && item.stock > 0) ||
            (filter === "low" && item.stock > 0 && item.stock <= 3);

        return matchesQuery && matchesCategory && matchesStock;
    });

    resultCount.innerText = `${filteredMenus.length} menu`;
    menuContainer.innerHTML = filteredMenus.length
        ? filteredMenus.map((item, index) => menuCard(item, index)).join("")
        : emptyState("Menu tidak ditemukan. Coba ubah kata kunci atau filter.");
    
    window.lucide?.createIcons();
}

function renderFavorites() {
    const favContainer = byId("daftar-favorit");
    if (!favContainer) return;
    const favs = menus.filter(m => favoriteIds.has(m.id));
    if (favs.length === 0) {
        favContainer.innerHTML = `<div class="rounded-[22px] bg-slate-50 p-8 text-center md:col-span-2 xl:col-span-3">
            <i data-lucide="heart" class="mx-auto h-12 w-12 text-slate-300"></i>
            <p class="mt-4 text-sm font-bold text-slate-500">Belum ada item favorit.</p>
        </div>`;
    } else {
        favContainer.innerHTML = favs.map((item, index) => menuCard(item, index)).join("");
    }
    window.lucide?.createIcons();
}

function renderOrders(orders) {
    if (!orders.length) {
        orderList.innerHTML = `<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Belum ada pesanan aktif.</p>`;
        return;
    }

    orderList.innerHTML = orders.map((order, index) => `
        <article class="order-item rounded-2xl border border-slate-200 bg-white p-4" style="animation-delay:${index * 70}ms">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h3 class="text-sm font-black text-resqBlue">${escapeHtml(order.name)}</h3>
                    <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(order.method)} &middot; ${formatRupiah(order.price)}</p>
                </div>
                <span class="rounded-full px-3 py-1 text-[11px] font-black ${statusClass(order.status)}">${escapeHtml(order.status)}</span>
            </div>
            <div class="mt-3 flex items-center justify-between gap-3">
                <div class="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black tracking-wide text-resqBlue">
                    Kode: ${escapeHtml(order.code)}
                </div>
                ${order.status === "Selesai" ? `<button data-ulasan="${escapeHtml(order.id)}" class="motion-button rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-black text-resqBlue hover:bg-slate-200">Beri Ulasan</button>` : ""}
            </div>
        </article>
    `).join("");
}

function updateStats() {
    const availableMenus = menus.filter((item) => item.stock > 0);
    const totalStock = menus.reduce((sum, item) => sum + item.stock, 0);
    const savedOrders = userOrders.filter((order) => order.status === "Selesai").length;
    const readyOrders = userOrders.filter((order) => order.status === "Siap Diambil").length;

    animateNumber(totalMenuStat, availableMenus.length);
    animateNumber(totalStockStat, totalStock);
    animateNumber(totalOrdersStat, userOrders.length);
    animateNumber(savedFoodStat, savedOrders);
    animateNumber(readyOrdersStat, readyOrders);
}

function selectMenu(item) {
    selectedMenu = item;

    selectedBadge.innerText = "Dipilih";
    selectedBadge.className = "rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-resqBlue";
    emptySummary.classList.add("hidden");
    orderSummary.classList.remove("hidden");

    summaryImage.src = item.imageUrl;
    summaryImage.alt = item.name;
    summaryPartner.innerText = item.restaurantId;
    summaryName.innerText = item.name;
    summaryPrice.innerText = formatRupiah(item.price);

    orderSummary.classList.remove("selected-pulse");
    requestAnimationFrame(() => orderSummary.classList.add("selected-pulse"));

    modalPartner.innerText = item.restaurantId;
    modalName.innerText = item.name;
    modalPrice.innerText = formatRupiah(item.price);
    updatePaymentPreview();
}

function clearSelection() {
    selectedMenu = null;
    selectedBadge.innerText = "Kosong";
    selectedBadge.className = "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500";
    emptySummary.classList.remove("hidden");
    orderSummary.classList.add("hidden");
}

function menuCard(item, index = 0) {
    const disabled = item.stock <= 0;
    const stockLabel = disabled ? "Stok habis" : `${item.stock} porsi`;
    const stockClass = disabled ? "bg-red-50 text-red-600" : item.stock <= 3 ? "bg-yellow-100 text-resqBlue" : "bg-emerald-50 text-emerald-700";
    const delay = Math.min(index * 55, 330);
    const isFav = favoriteIds.has(item.id);
    const heartColor = isFav ? "text-red-500" : "text-slate-400";
    const heartFill = isFav ? "fill-current" : "";

    return `
        <article class="menu-card flex min-h-[330px] flex-col rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm" style="animation-delay:${delay}ms">
            <div class="relative rounded-[20px] bg-[#fff8d7] p-4">
                <button data-favorite="${escapeHtml(item.id)}" class="absolute left-3 top-3 z-10 rounded-full bg-white/80 p-2 ${heartColor} backdrop-blur transition hover:text-red-500 hover:scale-110">
                    <i data-lucide="heart" class="h-4 w-4 ${heartFill}"></i>
                </button>
                <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-36 w-full object-contain transition duration-300 hover:scale-105" onerror="this.src='./assets/burger-signin.png'">
                <span class="absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-black ${stockClass}">${escapeHtml(stockLabel)}</span>
            </div>
            <div class="flex flex-1 flex-col pt-4">
                <p class="text-xs font-bold uppercase tracking-[.16em] text-slate-400">${escapeHtml(item.restaurantId)}</p>
                <h3 class="mt-1 line-clamp-2 text-lg font-black leading-snug text-resqBlue">${escapeHtml(item.name)}</h3>
                <p class="mt-2 text-xs font-bold text-slate-400">${escapeHtml(item.category)}</p>
                <div class="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span class="text-lg font-black text-resqBlue">${formatRupiah(item.price)}</span>
                    <button
                        data-order
                        data-id="${escapeHtml(item.id)}"
                        ${disabled ? "disabled" : ""}
                        class="motion-button rounded-2xl bg-resqYellow px-5 py-2.5 text-sm font-black text-resqNavy transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                        ${disabled ? "Habis" : "Pesan"}
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderDashboardMenus() {
    const latestMenus = menus.slice(0, 3);
    const recommendedMenus = [...menus]
        .filter((item) => item.stock > 0)
        .sort((a, b) => a.price - b.price)
        .slice(0, 3);

    latestMenuContainer.innerHTML = latestMenus.length
        ? latestMenus.map((item, index) => compactMenuCard(item, index)).join("")
        : emptyState("Belum ada makanan terbaru dari mitra.");

    recommendationContainer.innerHTML = recommendedMenus.length
        ? recommendedMenus.map((item, index) => recommendationCard(item, index)).join("")
        : emptyState("Belum ada rekomendasi makanan.");

    window.lucide?.createIcons();
}

function compactMenuCard(item, index = 0) {
    return `
        <article class="menu-card rounded-xl border border-slate-200 bg-white p-4" style="animation-delay:${index * 60}ms">
            <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-28 w-full rounded-xl bg-yellow-50 object-contain p-3" onerror="this.src='./assets/burger-signin.png'">
            <p class="mt-4 text-xs font-bold uppercase tracking-[.16em] text-slate-400">${escapeHtml(item.restaurantId)}</p>
            <h3 class="mt-1 line-clamp-2 text-sm font-black text-resqBlue">${escapeHtml(item.name)}</h3>
            <div class="mt-4 flex items-center justify-between">
                <span class="text-sm font-black text-resqBlue">${formatRupiah(item.price)}</span>
                <button data-order data-id="${escapeHtml(item.id)}" class="motion-button rounded-lg bg-resqYellow px-3 py-2 text-xs font-black text-resqNavy">Pesan</button>
            </div>
        </article>
    `;
}

function recommendationCard(item, index = 0) {
    return `
        <article class="order-item flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3" style="animation-delay:${index * 70}ms">
            <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-16 w-16 rounded-xl bg-yellow-50 object-contain p-2" onerror="this.src='./assets/burger-signin.png'">
            <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-black text-resqBlue">${escapeHtml(item.name)}</p>
                <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(item.category)} &middot; ${item.stock} porsi</p>
            </div>
            <p class="text-sm font-black text-emerald-600">${formatRupiah(item.price)}</p>
        </article>
    `;
}

function activateScreen(target) {
    if (!target) return;

    document.querySelectorAll(".app-screen").forEach((screen) => {
        screen.classList.toggle("active", screen.id === target);
    });

    document.querySelectorAll(".app-nav").forEach((button) => {
        const isActive = button.dataset.target === target;
        button.classList.toggle("nav-active", isActive);
        button.classList.toggle("text-slate-600", !isActive);
    });

    byId("mobile-menu")?.classList.add("hidden");
    byId("mobile-menu")?.classList.remove("flex");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.lucide?.createIcons();

    if (target === "peta") {
        setTimeout(initMap, 300);
    }
}

function normalizeCategory(value = "") {
    const text = String(value).toLowerCase();
    if (text.includes("bread") || text.includes("roti") || text.includes("bakery") || text.includes("croissant") || text.includes("donut")) return "Bakery";
    if (text.includes("dairy") || text.includes("milk") || text.includes("susu") || text.includes("keju")) return "Dairy";
    if (text.includes("sayur") || text.includes("buah") || text.includes("vegetable") || text.includes("salad") || text.includes("fruit")) return "Sayur & Buah";
    return "Ready Meal";
}

function normalizeOrderStatus(status = "") {
    const text = String(status).toLowerCase();
    if (text.includes("selesai") || text.includes("diambil") || text.includes("picked") || text.includes("complete")) return "Selesai";
    if (text.includes("siap") || text.includes("pickup") || text.includes("ambil") || text.includes("menunggu")) return "Siap Diambil";
    return "Diproses";
}

function statusClass(status) {
    if (status === "Selesai") return "bg-emerald-50 text-emerald-700";
    if (status === "Siap Diambil") return "bg-blue-50 text-blue-700";
    return "bg-yellow-100 text-resqBlue";
}

function emptyState(message) {
    return `
        <div class="soft-reveal rounded-[22px] border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
            <img src="./assets/chef.png" alt="" class="float-gentle mx-auto h-28 object-contain opacity-80">
            <p class="mt-4 text-sm font-bold text-slate-500">${escapeHtml(message)}</p>
        </div>
    `;
}

function openModal() {
    if (!selectedMenu) return;
    updatePaymentPreview();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function animateNumber(element, targetValue) {
    if (!element) return;

    const target = Number(targetValue) || 0;
    const start = Number(element.innerText) || 0;
    const duration = 520;
    const startedAt = performance.now();

    function tick(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.innerText = Math.round(start + (target - start) * eased);

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

function showToast(title, message) {
    clearTimeout(toastTimer);
    toastTitle.innerText = title;
    toastMessage.innerText = message;
    toast.classList.remove("hidden");

    toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 4200);
}

function updatePaymentPreview() {
    if (!selectedMenu || !qrisDemoPanel) return;

    if (paymentMethod.value !== "QRIS") {
        qrisDemoPanel.classList.add("hidden");
        confirmButton.innerText = "Buat Pesanan";
        return;
    }

    qrisDemoAmount.innerText = formatRupiah(selectedMenu.price);
    qrisDemoImage.src = createDemoQris(selectedMenu);
    qrisDemoPanel.classList.remove("hidden");
    confirmButton.innerText = "Bayar QRIS Demo";
}

function createDemoQris(item) {
    const payload = `RESQ-DEMO|${item.id}|${item.name}|${item.restaurantId}|${item.price}`;
    const size = 25;
    const cell = 8;
    const quiet = 16;
    const total = size * cell + quiet * 2;
    const hash = hashString(payload);
    const modules = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const inFinder =
                isFinder(x, y, 0, 0) ||
                isFinder(x, y, size - 7, 0) ||
                isFinder(x, y, 0, size - 7);

            if (inFinder || shouldFillModule(x, y, hash, payload.length)) {
                modules.push(`<rect x="${quiet + x * cell}" y="${quiet + y * cell}" width="${cell}" height="${cell}" rx="1" fill="#111827"/>`);
            }
        }
    }

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
            <rect width="100%" height="100%" rx="18" fill="#ffffff"/>
            ${modules.join("")}
            <rect x="${quiet + 9 * cell}" y="${quiet + 10 * cell}" width="${7 * cell}" height="${5 * cell}" rx="8" fill="#ffffff"/>
            <text x="${total / 2}" y="${quiet + 13.4 * cell}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#111827">RESQ</text>
            <text x="${total / 2}" y="${total - 7}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="#64748b">QRIS DEMO</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function isFinder(x, y, startX, startY) {
    if (x < startX || x > startX + 6 || y < startY || y > startY + 6) return false;
    const edge = x === startX || x === startX + 6 || y === startY || y === startY + 6;
    const center = x >= startX + 2 && x <= startX + 4 && y >= startY + 2 && y <= startY + 4;
    return edge || center;
}

function shouldFillModule(x, y, hash, salt) {
    const value = (x * 37 + y * 53 + hash + salt * 19 + (x ^ y) * 7) % 11;
    return value === 0 || value === 2 || value === 5 || value === 7;
}

function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function initMap() {
    if (!byId("resq-map")) return;
    
    if (!resqMap) {
        resqMap = L.map("resq-map").setView([-6.9147, 107.6098], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(resqMap);
        
        const resqIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #FACC15; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #011837; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#011837" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });

        const uniquePartners = [...new Set(menus.map(m => m.restaurantId))];
        
        uniquePartners.forEach((partner, i) => {
            const partnerMenus = menus.filter(m => m.restaurantId === partner && m.stock > 0);
            if (partnerMenus.length === 0) return;
            
            const lat = -6.9147 + (Math.sin(i * 1.5) * 0.02);
            const lng = 107.6098 + (Math.cos(i * 1.5) * 0.02);
            
            const marker = L.marker([lat, lng], {icon: resqIcon}).addTo(resqMap);
            
            let popupContent = `<div class="p-1 min-w-[200px]">
                <h4 class="font-black text-[#011837] text-sm">${escapeHtml(partner)}</h4>
                <p class="text-xs font-semibold text-slate-500 mb-2">${partnerMenus.length} menu surplus</p>
                <div class="space-y-2 mt-2 border-t border-slate-200 pt-2">`;
                
            partnerMenus.slice(0, 2).forEach(m => {
                popupContent += `<div class="flex justify-between items-center text-xs">
                    <span class="truncate font-semibold max-w-[120px]">${escapeHtml(m.name)}</span>
                    <span class="font-black text-emerald-600 ml-2">${formatRupiah(m.price)}</span>
                </div>`;
            });
            
            if (partnerMenus.length > 2) {
                popupContent += `<p class="text-[10px] text-center text-slate-400 mt-2">Dan ${partnerMenus.length - 2} menu lainnya...</p>`;
            }
            
            popupContent += `</div><button onclick="document.querySelector('[data-target=\\'makanan\\']').click(); setTimeout(() => { document.getElementById('input-cari').value = '${escapeHtml(partner)}'; document.getElementById('input-cari').dispatchEvent(new Event('input')); }, 100);" class="mt-3 w-full bg-[#FACC15] text-[#011837] text-xs font-black py-2 rounded-lg transition hover:bg-yellow-400">Pesan Sekarang</button></div>`;
            
            marker.bindPopup(popupContent);
        });
    }
    
    resqMap.invalidateSize();
}
