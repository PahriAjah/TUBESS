import { auth, realtimeDb, signOut, ref, get, push, serverTimestamp } from "./firebase.js";
import { isPartnerAccount, requireAuth } from "./auth-flow.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

const menuContainer = byId("daftar-menu");
const profile = byId("profil-user");
const userName = byId("nama-user");
const userEmailLabel = byId("email-user");
const userInitial = byId("user-initial");
const logoutButton = byId("btn-logout");
const logoutTopButton = byId("btn-logout-top");
const searchInput = byId("input-cari");
const dashboardSearchInput = byId("dashboard-search");
const dashboardSortButton = byId("dashboard-sort");
const categoryFilter = byId("filter-kategori");
const stockFilter = byId("filter-stok");
const resetFilterButton = byId("btn-reset-filter");
const resultCount = byId("jumlah-hasil");
const totalMenuStat = byId("stat-menu");
const totalStockStat = byId("stat-stock");
const totalOrdersStat = byId("stat-orders");
const savedFoodStat = byId("stat-saved");
const readyOrdersStat = byId("stat-ready");
const impactCo2 = byId("impact-co2");
const impactWater = byId("impact-water");
const impactPoints = byId("impact-points");
const orderList = byId("daftar-pesanan");
const latestMenuContainer = byId("latest-menu");
const recommendationContainer = byId("rekomendasi-menu");
const profileNameInput = byId("profile-name");
const profileEmailInput = byId("profile-email");
const LOCAL_MENUS_KEY = "resq_partner_uploaded_menus";
const LOCAL_ORDERS_KEY = "resq_user_orders";

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
const btnMyLocation = byId("btn-my-location");

const modalUlasan = byId("modal-ulasan");
const btnTutupUlasan = byId("btn-tutup-ulasan");
const btnKirimUlasan = byId("btn-kirim-ulasan");
const ratingStars = document.querySelectorAll("#rating-stars button");
const ulasanTeks = byId("ulasan-teks");

const btnNotification = byId("btn-notification");
const notificationPopover = byId("notification-popover");
const notificationDot = byId("notification-dot");
const notificationStatus = byId("notification-status");

let selectedMenu = null;
let userEmail = "Guest";
let menus = [];
let userOrders = [];
let toastTimer = null;
let resqMap = null;
let userLocation = null;
let userMarker = null;
let favoriteIds = new Set();
let dashboardQuery = "";
let dashboardCategory = "all";
let dashboardSort = "latest";

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

logoutTopButton?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});

searchInput?.addEventListener("input", renderMenus);
categoryFilter?.addEventListener("change", renderMenus);
stockFilter?.addEventListener("change", renderMenus);
initFilterDropdowns();

resetFilterButton?.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    stockFilter.value = "all";
    syncFilterDropdown(categoryFilter);
    syncFilterDropdown(stockFilter);
    renderMenus();
});

dashboardSearchInput?.addEventListener("input", (event) => {
    dashboardQuery = event.target.value.trim().toLowerCase();
    renderDashboardMenus();
});

document.querySelectorAll("[data-dashboard-category]").forEach((button) => {
    button.addEventListener("click", () => {
        dashboardCategory = button.dataset.dashboardCategory || "all";
        document.querySelectorAll("[data-dashboard-category]").forEach((item) => {
            const isActive = item === button;
            item.classList.toggle("is-active", isActive);
            item.classList.toggle("bg-resqYellow", isActive);
            item.classList.toggle("text-resqNavy", isActive);
            item.classList.toggle("border-resqNavy", isActive);
            
            item.classList.toggle("bg-white", !isActive);
            item.classList.toggle("text-slate-700", !isActive);
            item.classList.toggle("border-slate-200", !isActive);
        });
        renderDashboardMenus();
    });
});

dashboardSortButton?.addEventListener("click", () => {
    dashboardSort = dashboardSort === "price-low" ? "price-high" : "price-low";
    dashboardSortButton.innerHTML = `${dashboardSort === "price-low" ? "Harga terendah" : "Harga tertinggi"} <i class="ph ph-caret-down text-gray-500"></i>`;
    renderDashboardMenus();
});

document.querySelectorAll(".dashboard-toast-trigger").forEach((button) => {
    button.addEventListener("click", () => showDashboardToast(`${button.textContent.trim()} dipilih`));
});

document.querySelectorAll(".filter-order").forEach((button) => {
    button.addEventListener("click", () => {
        const status = button.dataset.status || "all";
        document.querySelectorAll(".filter-order").forEach((item) => {
            const isActive = item === button;
            item.classList.toggle("active", isActive);
            item.classList.toggle("bg-resqBlue", isActive);
            item.classList.toggle("text-white", isActive);
            item.classList.toggle("bg-white", !isActive);
            item.classList.toggle("text-slate-600", !isActive);
            item.classList.toggle("ring-1", !isActive);
            item.classList.toggle("ring-slate-200", !isActive);
        });
        
        if (status === "all") {
            renderOrders(userOrders);
        } else {
            renderOrders(userOrders.filter(o => o.status === status));
        }
    });
});

// Global listener for all menu item selection buttons
document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order]");
    if (!button) return;

    const id = button.dataset.id || button.dataset.order;
    if (!id) return;

    const item = menus.find((menu) => menu.id === id);
    if (!item) return;

    selectMenu(item);
    openModal();
});

document.querySelectorAll(".app-nav").forEach((button) => {
    button.addEventListener("click", () => activateScreen(button.dataset.target));
});

btnNotification?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isHidden = notificationPopover.classList.contains("hidden");
    
    if (isHidden) {
        notificationPopover.classList.remove("hidden");
        btnNotification.setAttribute("aria-expanded", "true");
        
        // Mark as read automatically when opened
        if (notificationDot) {
            notificationDot.classList.add("hidden");
        }
        if (notificationStatus) {
            notificationStatus.innerText = "Tidak ada yang baru";
            notificationStatus.className = "rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-400";
        }
    } else {
        notificationPopover.classList.add("hidden");
        btnNotification.setAttribute("aria-expanded", "false");
    }
});

document.addEventListener("click", (event) => {
    if (notificationPopover && !notificationPopover.classList.contains("hidden")) {
        if (!notificationPopover.contains(event.target) && !btnNotification.contains(event.target)) {
            notificationPopover.classList.add("hidden");
            btnNotification.setAttribute("aria-expanded", "false");
        }
    }
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

btnMyLocation?.addEventListener("click", () => {
    if (navigator.geolocation) {
        const icon = btnMyLocation.querySelector("i");
        icon?.classList.add("animate-pulse", "text-resqYellow");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                icon?.classList.remove("animate-pulse", "text-resqYellow");
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                if (resqMap) {
                    resqMap.setView([userLocation.lat, userLocation.lng], 14);
                    if (userMarker) {
                        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
                    } else {
                        const userIcon = L.divIcon({
                            className: 'custom-user-icon',
                            html: `<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #3B82F6, 0 4px 6px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        });
                        userMarker = L.marker([userLocation.lat, userLocation.lng], {icon: userIcon, zIndexOffset: 1000}).addTo(resqMap);
                        userMarker.bindPopup('<b class="text-sm font-black text-resqBlue">Lokasi Kamu</b>').openPopup();
                    }
                }
                
                menus.forEach(m => {
                    m.distance = calculateDistance(userLocation.lat, userLocation.lng, m.lat, m.lng);
                });
                
                renderMenus();
                renderDashboardMenus();
                renderFavorites();
            },
            (error) => {
                icon?.classList.remove("animate-pulse", "text-resqYellow");
                showToast("Lokasi Gagal", "Tidak dapat mengambil lokasi. Periksa izin GPS.");
            }
        );
    } else {
        showToast("Error", "Browser Anda tidak mendukung geolokasi.");
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
        const orderPayload = {
            id: `local-order-${Date.now()}`,
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
            timestamp: Date.now(),
            firebase_timestamp: serverTimestamp()
        };

        saveLocalListItem(LOCAL_ORDERS_KEY, orderPayload);

        try {
            await push(ref(realtimeDb, "orders"), orderPayload);
        } catch (error) {
            console.warn("Order saved locally because Firebase write failed:", error);
        }

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
    let data = readLocalList(LOCAL_MENUS_KEY);

    try {
        const snapshot = await get(ref(realtimeDb, "menus"));
        const firebaseMenus = [];

        snapshot.forEach((childSnapshot) => {
            firebaseMenus.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        data = mergeById(data, firebaseMenus);
    } catch (error) {
        console.warn("Menu Firebase read failed; using local menus.", error);
    }

    const uniquePartners = [...new Set(data.map(item => item.restaurant_id || "Partner RESQ"))];

    menus = data.map((item) => {
        const partner = item.restaurant_id || "Partner RESQ";
        const i = uniquePartners.indexOf(partner);
        const lat = item.latitude || item.location?.lat || -6.9147 + (Math.sin(i * 1.5) * 0.02);
        const lng = item.longitude || item.location?.lng || 107.6098 + (Math.cos(i * 1.5) * 0.02);

        return {
            id: item.id,
            name: item.name || "Menu RESQ",
            stock: Number(item.stock) || 0,
            price: Number(item.surplus_price || item.price) || 0,
            restaurantId: partner,
            category: normalizeCategory(item.category || item.kategori || item.type || item.name),
            imageUrl: item.image_url || item.imageUrl || item.image || "./assets/burger-signin.png",
            partnerUid: item.partner_uid || "",
            lat,
            lng
        };
    }).filter((item) => item.name && item.price > 0);

    updateStats();
    renderMenus();
    renderDashboardMenus();
}

async function loadOrders() {
    let rawOrders = readLocalList(LOCAL_ORDERS_KEY);

    try {
        const snapshot = await get(ref(realtimeDb, "orders"));
        const firebaseOrders = [];

        snapshot.forEach((childSnapshot) => {
            firebaseOrders.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        rawOrders = mergeById(rawOrders, firebaseOrders);
    } catch (error) {
        console.warn("Order Firebase read failed; using local orders.", error);
    }

    const orders = rawOrders
        .filter((item) => item.customer_email === userEmail)
        .map((item) => ({
            id: item.id,
            name: item.product_name || "Pesanan RESQ",
            price: Number(item.total_price) || 0,
            method: item.payment_method || "-",
            code: item.pickup_code || "-",
            status: normalizeOrderStatus(item.status || "Diproses"),
            timestamp: item.timestamp || 0
        }))
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    userOrders = orders;
    renderOrders(orders);
    updateStats();
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

function initFilterDropdowns() {
    const dropdowns = document.querySelectorAll("[data-filter-dropdown]");
    if (!dropdowns.length) return;

    const closeAll = (except = null) => {
        dropdowns.forEach((dropdown) => {
            if (dropdown === except) return;
            dropdown.classList.remove("is-open");
            dropdown.querySelector(".filter-trigger")?.setAttribute("aria-expanded", "false");
        });
    };

    dropdowns.forEach((dropdown) => {
        const select = dropdown.querySelector("select");
        const trigger = dropdown.querySelector(".filter-trigger");
        const options = dropdown.querySelectorAll(".filter-option");
        if (!select || !trigger || !options.length) return;

        trigger.addEventListener("click", () => {
            const willOpen = !dropdown.classList.contains("is-open");
            closeAll(dropdown);
            dropdown.classList.toggle("is-open", willOpen);
            trigger.setAttribute("aria-expanded", String(willOpen));
        });

        options.forEach((option) => {
            option.addEventListener("click", () => {
                select.value = option.dataset.value || "all";
                syncFilterDropdown(select);
                select.dispatchEvent(new Event("change", { bubbles: true }));
                closeAll();
            });
        });

        select.addEventListener("change", () => syncFilterDropdown(select));
        syncFilterDropdown(select);
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest("[data-filter-dropdown]")) closeAll();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAll();
    });
}

function syncFilterDropdown(select) {
    if (!select) return;

    const dropdown = select.closest("[data-filter-dropdown]");
    const label = dropdown?.querySelector(".filter-trigger-text");
    const selectedOption = select.options[select.selectedIndex];
    if (label && selectedOption) label.innerText = selectedOption.text;

    dropdown?.querySelectorAll(".filter-option").forEach((option) => {
        const isSelected = option.dataset.value === select.value;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-selected", String(isSelected));
    });
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
        orderList.innerHTML = `
            <div class="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <div class="mb-4 rounded-full bg-slate-50 p-4">
                    <i data-lucide="shopping-bag" class="h-8 w-8 text-slate-300"></i>
                </div>
                <h3 class="text-lg font-black text-resqBlue">Belum ada pesanan</h3>
                <p class="mt-1 text-sm font-medium text-slate-400">Pesanan yang kamu buat akan tampil di sini.</p>
            </div>
        `;
        window.lucide?.createIcons();
        return;
    }

    orderList.innerHTML = orders.map((order, index) => {
        const menu = menus.find(m => m.id === order.product_id || m.name === order.name);
        const imageUrl = menu ? menu.imageUrl : "./assets/burger-signin.png";
        const date = order.timestamp ? new Date(order.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";
        
        return `
            <article class="order-item group flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all hover:border-resqBlue/30 hover:shadow-md md:flex-row" style="animation-delay:${index * 60}ms">
                <div class="relative h-44 w-full shrink-0 bg-slate-50 p-4 md:h-auto md:w-48">
                    <img src="${imageUrl}" alt="${escapeHtml(order.name)}" class="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent"></div>
                </div>
                <div class="flex flex-1 flex-col p-6">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">${date}</span>
                                <span class="h-1 w-1 rounded-full bg-slate-300"></span>
                                <span class="text-[10px] font-black uppercase tracking-widest text-resqBlue">${escapeHtml(order.method)}</span>
                            </div>
                            <h3 class="mt-1 text-lg font-black text-resqBlue">${escapeHtml(order.name)}</h3>
                        </div>
                        <span class="rounded-full px-4 py-1.5 text-[11px] font-black shadow-sm ${statusClass(order.status)}">${escapeHtml(order.status)}</span>
                    </div>
                    
                    <div class="mt-auto pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
                        <div class="flex items-center gap-4">
                            <div>
                                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Pickup</p>
                                <p class="mt-0.5 font-mono text-sm font-black text-resqBlue">${escapeHtml(order.code)}</p>
                            </div>
                            <div class="h-8 w-px bg-slate-100"></div>
                            <div>
                                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Bayar</p>
                                <p class="mt-0.5 text-sm font-black text-resqBlue">${formatRupiah(order.price)}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            ${order.status === "Selesai" ? `
                                <button data-ulasan="${escapeHtml(order.id)}" class="motion-button flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-black text-resqBlue transition hover:bg-slate-200">
                                    <i data-lucide="star" class="h-3.5 w-3.5"></i>
                                    Beri Ulasan
                                </button>
                            ` : ""}
                            <button class="motion-button flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-resqBlue hover:text-white" aria-label="Detail Pesanan">
                                <i data-lucide="chevron-right" class="h-5 w-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");
    window.lucide?.createIcons();
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

    animateNumber(impactCo2, savedOrders * 2.5, true);
    animateNumber(impactWater, savedOrders * 150);
    animateNumber(impactPoints, savedOrders * 50);

    const sideOrdersStat = byId("stat-orders-side");
    const sideCo2Stat = byId("impact-co2-side");
    if (sideOrdersStat) animateNumber(sideOrdersStat, userOrders.length);
    if (sideCo2Stat) animateNumber(sideCo2Stat, savedOrders * 2.5, true);
}

function selectMenu(item) {
    selectedMenu = item;

    if (selectedBadge) {
        selectedBadge.innerText = "Dipilih";
        selectedBadge.className = "rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-resqBlue";
    }
    
    if (emptySummary) emptySummary.classList.add("hidden");
    if (orderSummary) {
        orderSummary.classList.remove("hidden");
        orderSummary.classList.remove("selected-pulse");
        requestAnimationFrame(() => orderSummary.classList.add("selected-pulse"));
    }

    if (summaryImage) {
        summaryImage.src = item.imageUrl;
        summaryImage.alt = item.name;
    }
    if (summaryPartner) summaryPartner.innerText = item.restaurantId;
    if (summaryName) summaryName.innerText = item.name;
    if (summaryPrice) summaryPrice.innerText = formatRupiah(item.price);

    if (modalPartner) modalPartner.innerText = item.restaurantId;
    if (modalName) modalName.innerText = item.name;
    if (modalPrice) modalPrice.innerText = formatRupiah(item.price);
    
    updatePaymentPreview();
}

function clearSelection() {
    selectedMenu = null;
    if (selectedBadge) {
        selectedBadge.innerText = "Kosong";
        selectedBadge.className = "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500";
    }
    if (emptySummary) emptySummary.classList.remove("hidden");
    if (orderSummary) orderSummary.classList.add("hidden");
}

function menuCard(item, index = 0) {
    const disabled = item.stock <= 0;
    const stockLabel = disabled ? "Stok habis" : `${item.stock} porsi`;
    const stockClass = disabled ? "bg-red-50 text-red-600" : item.stock <= 3 ? "bg-yellow-100 text-resqBlue" : "bg-emerald-50 text-emerald-700";
    const delay = Math.min(index * 55, 330);

    const distanceHtml = userLocation && item.distance !== undefined
        ? `<div class="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-500"><i data-lucide="navigation" class="h-3 w-3 text-resqBlue"></i> ${item.distance.toFixed(1)} km dari lokasimu</div>`
        : '';

    const isFav = favoriteIds.has(item.id);
    const heartColor = isFav ? "text-red-500" : "text-slate-400";
    const heartFill = isFav ? "fill-current" : "";

    return `
        <article class="menu-card flex min-h-[330px] flex-col rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm" style="animation-delay:${delay}ms">
            <div class="relative flex h-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-4">
                <button data-favorite="${escapeHtml(item.id)}" class="absolute left-3 top-3 z-10 rounded-full bg-white/80 p-2 ${heartColor} backdrop-blur transition hover:text-red-500 hover:scale-110" aria-label="Favorit">
                    <i data-lucide="heart" class="h-4 w-4 ${heartFill}"></i>
                </button>
                <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-36 w-full object-contain transition duration-300 hover:scale-105" onerror="this.src='./assets/burger-signin.png'">
                <span class="absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-black ${stockClass}">${escapeHtml(stockLabel)}</span>
            </div>
            <div class="flex flex-1 flex-col justify-between mt-4">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">${escapeHtml(item.category)} &middot; ${escapeHtml(item.restaurantId)}</p>
                    <h3 class="mt-1 text-lg font-black leading-snug text-resqBlue">${escapeHtml(item.name)}</h3>
                    ${distanceHtml}
                </div>
                <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span class="text-xl font-black text-emerald-600">${formatRupiah(item.price)}</span>
                    <button data-order="${escapeHtml(item.id)}" class="motion-button grid h-10 place-items-center rounded-xl bg-resqYellow px-4 text-sm font-black text-resqNavy transition hover:bg-yellow-400 disabled:opacity-50" ${disabled ? "disabled" : ""}>Pilih</button>
                </div>
            </div>
        </article>
    `;
}

function renderDashboardMenus() {
    const dashboardMenus = menus
        .filter((item) => {
            const matchesQuery = `${item.name} ${item.restaurantId} ${item.category}`.toLowerCase().includes(dashboardQuery);
            const matchesCategory = dashboardCategory === "all" || item.category === dashboardCategory;
            return matchesQuery && matchesCategory;
        })
        .sort((a, b) => {
            if (dashboardSort === "price-low") return a.price - b.price;
            if (dashboardSort === "price-high") return b.price - a.price;
            return 0;
        });

    const latestMenus = dashboardMenus.slice(0, 4);
    const recommendedMenus = [...menus]
        .filter((item) => item.stock > 0)
        .sort((a, b) => a.price - b.price)
        .slice(0, 3);

    latestMenuContainer.innerHTML = latestMenus.length
        ? latestMenus.map((item, index) => compactMenuCard(item, index)).join("")
        : emptyState("Menu tidak ditemukan. Coba kata kunci atau kategori lain.");

    recommendationContainer.innerHTML = recommendedMenus.length
        ? recommendedMenus.map((item, index) => recommendationCard(item, index)).join("")
        : emptyState("Belum ada rekomendasi makanan.");

    window.lucide?.createIcons();
}

function compactMenuCard(item, index = 0) {
    const isFav = favoriteIds.has(item.id);
    const heartColor = isFav ? "text-red-500" : "text-slate-400";
    const heartFill = isFav ? "fill-current" : "";

    return `
        <article class="product-card group flex flex-col" style="animation-delay:${index * 60}ms">
            <div class="relative mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-[24px] bg-slate-100/60 p-6 ring-1 ring-slate-200/50 shadow-inner">
                <button data-favorite="${escapeHtml(item.id)}" class="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 ${heartColor} shadow-sm backdrop-blur transition-transform hover:scale-110 hover:text-red-500" aria-label="Favorit">
                    <i data-lucide="heart" class="h-4 w-4 ${heartFill} transition-colors duration-200"></i>
                </button>
                <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-full w-full object-contain transition duration-500 group-hover:scale-110" onerror="this.src='./assets/burger-signin.png'">
            </div>
            <div class="mb-1 flex items-start justify-between gap-3 px-1">
                <h3 class="product-title text-[15px] font-black leading-snug text-resqBlue">${escapeHtml(item.name)}</h3>
                <span class="shrink-0 text-[15px] font-black text-resqBlue">${formatRupiah(item.price)}</span>
            </div>
            <p class="mb-2 px-1 text-xs font-semibold text-slate-500">${escapeHtml(item.restaurantId)} &middot; ${escapeHtml(item.category)}</p>
            <div class="mb-4 flex items-center gap-1 px-1">
                <div class="flex text-sm text-resqYellow">
                    <i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i>
                </div>
                <span class="ml-1 text-xs font-semibold text-slate-500">(${Math.max(12, item.stock * 9)})</span>
            </div>
            <button data-order data-id="${escapeHtml(item.id)}" class="add-to-cart-btn mt-auto w-full rounded-2xl bg-resqNavy px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95 disabled:opacity-50" ${item.stock <= 0 ? "disabled" : ""}>
                Pesan Sekarang
            </button>
        </article>
    `;
}

function showDashboardToast(message) {
    const container = byId("dashboard-toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "flex translate-y-[-20px] transform items-center gap-2 rounded-lg bg-gray-800 px-5 py-3 text-sm text-white opacity-0 shadow-lg transition-all duration-300";
    toast.innerHTML = `<i class="ph-fill ph-info text-resqYellow"></i> ${escapeHtml(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-[-20px]", "opacity-0");
        toast.classList.add("translate-y-0", "opacity-100");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-[-20px]", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
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
        
        // Handle color and visibility for simple icon buttons that don't use the underline
        if (button.querySelector("i") && !button.querySelector("span")) {
            button.classList.toggle("text-resqBlue", isActive);
            button.classList.toggle("text-slate-600", !isActive);
        }
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

function readLocalList(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
        console.error(`Local data read error for ${key}:`, error);
        return [];
    }
}

function saveLocalListItem(key, item) {
    const list = readLocalList(key);
    list.unshift(item);
    localStorage.setItem(key, JSON.stringify(list));
}

function mergeById(primary, secondary) {
    const items = new Map();
    [...primary, ...secondary].forEach((item) => {
        const id = item.id || item.local_id || `${item.product_id || item.name || item.product_name}-${item.created_at || item.timestamp || Math.random()}`;
        items.set(id, { ...item, id });
    });
    return [...items.values()];
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

function animateNumber(element, targetValue, isDecimal = false) {
    if (!element) return;

    const target = Number(targetValue) || 0;
    const start = parseFloat(element.innerText) || 0;
    const duration = 520;
    const startedAt = performance.now();

    function tick(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;
        
        element.innerText = isDecimal ? current.toFixed(1) : Math.round(current);

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
        
        uniquePartners.forEach((partner) => {
            const partnerMenus = menus.filter(m => m.restaurantId === partner && m.stock > 0);
            if (partnerMenus.length === 0) return;
            
            const lat = partnerMenus[0].lat;
            const lng = partnerMenus[0].lng;
            
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

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
