import { initAdminPage } from "./admin-shell.js";
import {
    filterDataForPartner,
    getCustomerName,
    getInitials,
    getPrimaryStoreName,
    isPickedUp,
    isWaitingPickup,
    loadAdminData
} from "./admin-data.js";
import { escapeHtml, formatRupiah } from "./utils.js";
import { renderMobileNav, renderScreens, renderSidebar } from "./admin-ui.js";

const foodImages = {
    croissant: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500&q=80",
    bento: "https://images.unsplash.com/photo-1579697096985-41fe1430e5ef?w=500&q=80",
    donuts: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80",
    salad: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=500&q=80",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
    ricebowl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80",
    vegetables: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80"
};

initAdminPage("dashboard", loadAdminDashboard);

async function loadAdminDashboard(user, partnerProfile) {
    renderLayout(staticAdminData());

    try {
        const { menus, orders } = filterDataForPartner(await loadAdminData(), partnerProfile);
        const storeName = getPrimaryStoreName(menus, orders);
        const dynamicData = mergeFirebaseData(staticAdminData(), menus, orders);

        document.title = `RESQ - Dashboard Mitra ${storeName}`;
        renderLayout(dynamicData);
    } catch (error) {
        console.error("Admin dashboard error:", error);
        renderLayout(staticAdminData());
    }
}

function renderLayout(data) {
    document.getElementById("admin-sidebar").innerHTML = renderSidebar();
    document.getElementById("mobile-admin-sidebar").innerHTML = renderMobileNav();
    document.getElementById("admin-screens").innerHTML = renderScreens(data);

    setupNavigation();
    setupMobileMenu();
    setupOrderInteractions(data.orders);
    window.lucide?.createIcons();
}

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach((button) => {
        button.addEventListener("click", () => {
            const target = button.dataset.target;

            document.querySelectorAll(".nav-link").forEach((item) => {
                item.classList.remove("nav-active");
                item.classList.add("text-gray-600", "font-medium");
            });

            document.querySelectorAll(`.nav-link[data-target="${target}"]`).forEach((item) => {
                item.classList.add("nav-active");
                item.classList.remove("text-gray-600", "font-medium");
            });

            document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
            document.getElementById(target)?.classList.add("active");
            document.getElementById("mobile-admin-sidebar")?.classList.add("hidden");
            window.scrollTo({ top: 0, behavior: "smooth" });
            window.lucide?.createIcons();
        });
    });
}

function setupMobileMenu() {
    document.getElementById("mobile-menu-toggle")?.addEventListener("click", () => {
        document.getElementById("mobile-admin-sidebar")?.classList.toggle("hidden");
        window.lucide?.createIcons();
    });
}

function setupOrderInteractions(initialOrders = []) {
    const page = document.querySelector("[data-orders-page]");
    if (!page) return;

    const orders = initialOrders.map((order, index) => normalizeOrderView(order, index));
    const state = {
        activeStatus: "Semua",
        query: "",
        sort: "Terbaru",
        selected: new Set(),
        modalOrderId: null
    };

    const elements = {
        statsGrid: document.getElementById("order-stats-grid"),
        tabs: [...document.querySelectorAll("[data-order-status]")],
        tabCounts: [...document.querySelectorAll("[data-order-tab-count]")],
        search: document.getElementById("order-search"),
        filterButton: document.getElementById("order-filter-button"),
        filterMenu: document.getElementById("order-filter-menu"),
        sortButtons: [...document.querySelectorAll("[data-order-sort]")],
        actionBar: document.getElementById("order-action-bar"),
        selectedCount: document.getElementById("selected-order-count"),
        tableBody: document.getElementById("orders-table-body"),
        emptyState: document.getElementById("orders-empty-state"),
        modal: document.getElementById("order-detail-modal"),
        modalName: document.getElementById("modal-order-name"),
        modalCode: document.getElementById("modal-order-code"),
        modalPrice: document.getElementById("modal-order-price"),
        modalStatus: document.getElementById("modal-order-status"),
        modalPickup: document.getElementById("modal-order-pickup"),
        modalComplete: document.getElementById("order-modal-complete"),
        modalClose: document.getElementById("order-modal-close"),
        modalCloseIcon: document.getElementById("order-modal-close-icon")
    };

    const render = () => {
        renderOrderStats(elements.statsGrid, orders);
        renderOrderTabs(elements.tabs, elements.tabCounts, orders, state.activeStatus);
        renderActionBar(elements.actionBar, elements.selectedCount, state.selected.size);
        renderOrderTable(elements.tableBody, elements.emptyState, getVisibleOrders(orders, state), state.selected);
        window.lucide?.createIcons();
    };

    elements.tabs.forEach((button) => {
        button.addEventListener("click", () => {
            state.activeStatus = button.dataset.orderStatus || "Semua";
            state.selected.clear();
            render();
        });
    });

    elements.search?.addEventListener("input", (event) => {
        state.query = event.target.value.trim().toLowerCase();
        render();
    });

    elements.filterButton?.addEventListener("click", () => {
        elements.filterMenu?.classList.toggle("hidden");
    });

    elements.sortButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.sort = button.dataset.orderSort || "Terbaru";
            elements.filterMenu?.classList.add("hidden");
            render();
        });
    });

    document.addEventListener("click", (event) => {
        if (!elements.filterButton?.contains(event.target) && !elements.filterMenu?.contains(event.target)) {
            elements.filterMenu?.classList.add("hidden");
        }
    });

    elements.tableBody?.addEventListener("click", (event) => {
        const checkbox = event.target.closest("[data-order-checkbox]");
        const row = event.target.closest("[data-order-row]");

        if (checkbox) {
            const orderId = checkbox.dataset.orderCheckbox;
            checkbox.checked ? state.selected.add(orderId) : state.selected.delete(orderId);
            render();
            return;
        }

        if (row) {
            openOrderModal(row.dataset.orderRow, orders, elements, state);
        }
    });

    document.querySelectorAll("[data-order-bulk]").forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.dataset.orderBulk;

            if (action === "clear") {
                state.selected.clear();
            } else {
                const nextStatus = action === "complete" ? "Selesai" : "Dibatalkan";
                orders.forEach((order) => {
                    if (state.selected.has(order.id)) {
                        order.status = nextStatus;
                        order.color = statusColor(nextStatus);
                    }
                });
                state.selected.clear();
            }

            render();
        });
    });

    elements.modalClose?.addEventListener("click", () => closeOrderModal(elements.modal));
    elements.modalCloseIcon?.addEventListener("click", () => closeOrderModal(elements.modal));
    elements.modal?.addEventListener("click", (event) => {
        if (event.target === elements.modal) closeOrderModal(elements.modal);
    });
    elements.modalComplete?.addEventListener("click", () => {
        const order = orders.find((item) => item.id === state.modalOrderId);
        if (!order) return;

        order.status = "Selesai";
        order.color = statusColor(order.status);
        closeOrderModal(elements.modal);
        render();
    });

    render();
}

function normalizeOrderView(order, index) {
    const code = order.code || order.product?.sub || `#ORD-${String(index + 1).padStart(3, "0")}`;
    const status = normalizeAdminOrderStatus(order.status);

    return {
        ...order,
        id: order.id || code.replace(/^#/, "") || `order-${index}`,
        code,
        product: {
            img: order.product?.img || pickImage(order.product?.name),
            name: order.product?.name || "Produk Surplus",
            sub: code
        },
        price: order.price || "Rp 0",
        priceValue: parsePrice(order.price),
        status,
        color: statusColor(status),
        pickup: order.pickup || "-",
        createdAt: Number(order.createdAt || Date.now() - index * 60000)
    };
}

function normalizeAdminOrderStatus(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("selesai") || normalized.includes("diambil") || normalized.includes("picked") || normalized.includes("complete")) return "Selesai";
    if (normalized.includes("batal") || normalized.includes("cancel") || normalized.includes("gagal")) return "Dibatalkan";
    return "Diproses";
}

function getVisibleOrders(orders, state) {
    const filtered = orders.filter((order) => {
        const matchesStatus = state.activeStatus === "Semua" || order.status === state.activeStatus;
        const text = `${order.product.name} ${order.code}`.toLowerCase();
        return matchesStatus && text.includes(state.query);
    });

    return [...filtered].sort((a, b) => {
        if (state.sort === "Terlama") return a.createdAt - b.createdAt;
        if (state.sort === "Harga terendah") return a.priceValue - b.priceValue;
        if (state.sort === "Harga tertinggi") return b.priceValue - a.priceValue;
        return b.createdAt - a.createdAt;
    });
}

function renderOrderStats(container, orders) {
    if (!container) return;

    const stats = [
        { icon: "box", label: "Total pesanan", value: orders.length },
        { icon: "clock", label: "Menunggu pickup", value: orders.filter((order) => order.status === "Diproses").length },
        { icon: "x-octagon", label: "Dibatalkan", value: orders.filter((order) => order.status === "Dibatalkan").length },
        { icon: "shopping-bag", label: "Pesanan selesai", value: orders.filter((order) => order.status === "Selesai").length }
    ];

    container.innerHTML = `<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">${stats.map((item) => `
        <article class="flex min-h-32 flex-col justify-between rounded-xl border border-gray-200 bg-resq-white p-5 shadow-sm transition-colors duration-200 hover:border-resq-navy">
            <div class="mb-3 flex items-center space-x-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600"><i data-lucide="${item.icon}" class="h-5 w-5"></i></div>
                <span class="text-sm font-medium text-gray-600">${item.label}</span>
            </div>
            <h3 class="text-2xl font-bold text-resq-navy">${item.value.toLocaleString("id-ID")}</h3>
        </article>
    `).join("")}</div>`;
}

function renderOrderTabs(tabs, counts, orders, activeStatus) {
    const totals = {
        Semua: orders.length,
        Selesai: orders.filter((order) => order.status === "Selesai").length,
        Diproses: orders.filter((order) => order.status === "Diproses").length,
        Dibatalkan: orders.filter((order) => order.status === "Dibatalkan").length
    };

    tabs.forEach((button) => {
        const isActive = button.dataset.orderStatus === activeStatus;
        button.classList.toggle("border-resq-navy", isActive);
        button.classList.toggle("font-bold", isActive);
        button.classList.toggle("text-resq-navy", isActive);
        button.classList.toggle("border-transparent", !isActive);
        button.classList.toggle("font-medium", !isActive);
        button.classList.toggle("text-gray-500", !isActive);
    });

    counts.forEach((item) => {
        item.textContent = totals[item.dataset.orderTabCount]?.toLocaleString("id-ID") || "0";
    });
}

function renderActionBar(actionBar, countLabel, count) {
    if (!actionBar || !countLabel) return;
    countLabel.textContent = count.toLocaleString("id-ID");
    actionBar.classList.toggle("hidden", count === 0);
    actionBar.classList.toggle("flex", count > 0);
}

function renderOrderTable(tableBody, emptyState, orders, selected) {
    if (!tableBody || !emptyState) return;

    tableBody.innerHTML = orders.map((order) => `
        <tr data-order-row="${escapeHtml(order.id)}" class="group cursor-pointer border-b border-gray-50 transition-colors duration-200 hover:bg-gray-50">
            <td class="py-4 pl-4 font-medium text-gray-600">
                <input data-order-checkbox="${escapeHtml(order.id)}" type="checkbox" aria-label="Pilih ${escapeHtml(order.product.name)}" ${selected.has(order.id) ? "checked" : ""} class="h-4 w-4 cursor-pointer rounded border-gray-300 text-resq-navy focus:ring-resq-navy">
            </td>
            <td class="py-4 pl-4 font-medium text-gray-600">${renderOrderProductCell(order.product)}</td>
            <td class="py-4 pl-4 font-medium text-gray-600">${escapeHtml(order.price)}</td>
            <td class="py-4 pl-4 font-medium text-gray-600">${renderStatusBadge(order.status)}</td>
            <td class="py-4 pl-4 font-medium text-gray-600">${escapeHtml(order.pickup)}</td>
        </tr>
    `).join("");

    emptyState.classList.toggle("hidden", orders.length > 0);
}

function renderOrderProductCell(product) {
    return `
        <div class="flex items-center space-x-4">
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                <img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover">
            </div>
            <div>
                <p class="font-bold text-resq-navy">${escapeHtml(product.name)}</p>
                <p class="text-xs text-gray-500">${escapeHtml(product.sub || "Surplus food")}</p>
            </div>
        </div>
    `;
}

function renderStatusBadge(status) {
    const styles = {
        Selesai: "bg-green-100 text-green-700",
        Diproses: "bg-resq-yellow/20 text-resq-navy",
        Dibatalkan: "bg-red-100 text-red-700"
    };

    return `<span class="inline-flex rounded-md px-3 py-1.5 text-[11px] font-bold ${styles[status] || "bg-gray-100 text-gray-600"}">${escapeHtml(status)}</span>`;
}

function openOrderModal(orderId, orders, elements, state) {
    const order = orders.find((item) => item.id === orderId);
    if (!order || !elements.modal) return;

    state.modalOrderId = order.id;
    elements.modalName.textContent = order.product.name;
    elements.modalCode.textContent = order.code;
    elements.modalPrice.textContent = order.price;
    elements.modalStatus.innerHTML = renderStatusBadge(order.status);
    elements.modalPickup.textContent = order.pickup;
    elements.modalComplete.classList.toggle("hidden", order.status === "Selesai");

    elements.modal.classList.remove("hidden");
    elements.modal.classList.add("flex");
    requestAnimationFrame(() => {
        elements.modal.classList.remove("opacity-0");
        elements.modal.querySelector("div")?.classList.remove("scale-95");
    });
}

function closeOrderModal(modal) {
    if (!modal) return;

    modal.classList.add("opacity-0");
    modal.querySelector("div")?.classList.add("scale-95");
    window.setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }, 180);
}

function parsePrice(price = "") {
    return Number(String(price).replace(/[^\d]/g, "")) || 0;
}

function mergeFirebaseData(baseData, menus, orders) {
    const activeOrders = orders.filter((order) => !isPickedUp(order.status));
    const waitingPickup = orders.filter((order) => isWaitingPickup(order.status));
    const totalStock = menus.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const revenue = orders.reduce((sum, order) => sum + Number(order.totalPrice || order.total || order.price || 0), 0);

    return {
        ...baseData,
        metrics: {
            totalOrders: orders.length.toLocaleString("id-ID"),
            activeOrders: activeOrders.length.toLocaleString("id-ID"),
            savedFood: totalStock.toLocaleString("id-ID"),
            revenue: revenue ? compactRupiah(revenue) : baseData.metrics.revenue
        },
        orderStats: [
            { icon: "box", label: "Total pesanan", value: orders.length.toLocaleString("id-ID") },
            { icon: "clock", label: "Menunggu pickup", value: waitingPickup.length.toLocaleString("id-ID") },
            { icon: "x-octagon", label: "Dibatalkan", value: orders.filter((order) => String(order.status).toLowerCase().includes("cancel")).length.toLocaleString("id-ID") },
            { icon: "shopping-bag", label: "Pesanan selesai", value: orders.filter((order) => isPickedUp(order.status)).length.toLocaleString("id-ID") }
        ],
        inventoryStats: [
            { icon: "package-check", label: "Stok tersedia", value: totalStock.toLocaleString("id-ID") },
            { icon: "alert-triangle", label: "Hampir habis", value: menus.filter((menu) => Number(menu.stock || 0) > 0 && Number(menu.stock || 0) <= 5).length.toLocaleString("id-ID") },
            { icon: "calendar-clock", label: "Expired hari ini", value: baseData.inventoryStats[2].value },
            { icon: "shopping-bag", label: "Pesanan aktif", value: activeOrders.length.toLocaleString("id-ID") }
        ],
        customerStats: buildCustomerStats(orders),
        orders: orders.length ? orders.slice(0, 8).map(orderToView) : baseData.orders,
        inventory: menus.length ? menus.slice(0, 8).map(menuToInventoryView) : baseData.inventory,
        products: menus.length ? menus.slice(0, 8).map(menuToProductView) : baseData.products,
        customers: buildCustomers(orders),
        activities: orders.length ? orders.slice(0, 4).map((order) => ({
            icon: "shopping-bag",
            title: `Pesanan ${order.id ? `#${order.id}` : "baru"}`,
            desc: `${order.productName || order.menuName || "Produk surplus"} dari ${getCustomerName(order.customerEmail)} menunggu proses pengelola`
        })) : baseData.activities
    };
}

function orderToView(order) {
    const status = order.status || "Diproses";
    return {
        product: {
            img: pickImage(order.productName || order.menuName),
            name: order.productName || order.menuName || "Produk Surplus",
            sub: order.id ? `#${order.id}` : getCustomerName(order.customerEmail)
        },
        price: formatRupiah(Number(order.totalPrice || order.total || order.price || 0)),
        status,
        color: statusColor(status),
        pickup: order.pickupTime || order.pickupCode || "-"
    };
}

function menuToInventoryView(menu) {
    const stock = Number(menu.stock || 0);
    const status = stock <= 0 ? "Expired" : stock <= 5 ? "Hampir habis" : "Tersedia";

    return {
        product: {
            img: menu.image || pickImage(menu.name),
            name: menu.name || "Produk Surplus",
            sub: menu.category || "Surplus food"
        },
        store: menu.restaurantId || "Mitra RESQ",
        stock: `${stock} pcs`,
        expired: menu.expiredAt || "Hari ini, 22:00",
        status,
        color: status === "Expired" ? "red" : status === "Hampir habis" ? "yellow" : "green"
    };
}

function menuToProductView(menu) {
    return {
        img: menu.image || pickImage(menu.name),
        name: menu.name || "Produk Surplus",
        price: formatRupiah(Number(menu.price || 0)),
        status: Number(menu.stock || 0) > 0 ? "Aktif" : "Draft"
    };
}

function buildCustomerStats(orders) {
    const customerGroups = groupOrdersByCustomer(orders);
    const totalCustomers = customerGroups.length;
    const repeatCustomers = customerGroups.filter((customer) => customer.orders.length > 1).length;
    const newCustomers = customerGroups.filter((customer) => isRecentTimestamp(customer.latestTimestamp)).length;
    const repeatRate = totalCustomers ? `${Math.round((repeatCustomers / totalCustomers) * 100)}%` : "0%";

    return [
        { icon: "users", label: "Total pelanggan", value: totalCustomers.toLocaleString("id-ID") },
        { icon: "user-plus", label: "Pelanggan baru", value: newCustomers.toLocaleString("id-ID") },
        { icon: "repeat", label: "Repeat order", value: repeatRate },
        { icon: "star", label: "Rating rata-rata", value: "-" }
    ];
}

function buildCustomers(orders) {
    return groupOrdersByCustomer(orders)
        .sort((a, b) => Number(b.latestTimestamp || 0) - Number(a.latestTimestamp || 0))
        .map((customer) => ({
            name: getCustomerName(customer.email),
            initials: getInitials(customer.email),
            sub: customer.lastProduct || "Pelanggan RESQ",
            email: customer.email,
            orders: customer.orders.length.toLocaleString("id-ID"),
            lastActive: formatRelativeDate(customer.latestTimestamp),
            status: "Aktif",
            statusColor: "green"
        }));
}

function groupOrdersByCustomer(orders) {
    const groups = new Map();

    orders.forEach((order) => {
        const email = String(order.customerEmail || "").trim().toLowerCase();
        if (!email) return;

        const existing = groups.get(email) || {
            email,
            orders: [],
            latestTimestamp: 0,
            lastProduct: ""
        };
        const timestamp = Number(order.timestamp || 0);

        existing.orders.push(order);
        if (timestamp >= Number(existing.latestTimestamp || 0)) {
            existing.latestTimestamp = timestamp;
            existing.lastProduct = order.productName || order.menuName || "Produk surplus";
        }

        groups.set(email, existing);
    });

    return [...groups.values()];
}

function isRecentTimestamp(timestamp) {
    const value = Number(timestamp || 0);
    if (!value) return false;

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - value <= sevenDays;
}

function formatRelativeDate(timestamp) {
    const value = Number(timestamp || 0);
    if (!value) return "-";

    const diff = Date.now() - value;
    const day = 24 * 60 * 60 * 1000;

    if (diff < day) return "Hari ini";
    if (diff < day * 2) return "Kemarin";
    return `${Math.max(1, Math.floor(diff / day))} hari lalu`;
}

function statusColor(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("selesai") || normalized.includes("complete") || normalized.includes("picked")) return "green";
    if (normalized.includes("ambil") || normalized.includes("pickup")) return "blue";
    if (normalized.includes("batal") || normalized.includes("cancel") || normalized.includes("gagal")) return "red";
    return "yellow";
}

function pickImage(value = "") {
    const name = value.toLowerCase();
    if (name.includes("croissant") || name.includes("bread") || name.includes("roti")) return foodImages.croissant;
    if (name.includes("bento") || name.includes("katsu")) return foodImages.bento;
    if (name.includes("donut")) return foodImages.donuts;
    if (name.includes("salad")) return foodImages.salad;
    if (name.includes("burger")) return foodImages.burger;
    if (name.includes("rice") || name.includes("nasi") || name.includes("ayam")) return foodImages.ricebowl;
    return foodImages.vegetables;
}

function compactRupiah(value) {
    if (value >= 1000000) return `Rp ${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
    return formatRupiah(value);
}

function staticAdminData() {
    return {
        metrics: {
            totalOrders: "579",
            activeOrders: "24",
            savedFood: "1.247",
            revenue: "Rp 18,4jt"
        },
        orderStats: [
            { icon: "box", label: "Total pesanan", value: "579" },
            { icon: "clock", label: "Menunggu pickup", value: "24" },
            { icon: "x-octagon", label: "Dibatalkan", value: "5" },
            { icon: "shopping-bag", label: "Pesanan selesai", value: "347" }
        ],
        inventoryStats: [
            { icon: "package-check", label: "Stok tersedia", value: "312" },
            { icon: "alert-triangle", label: "Hampir habis", value: "19" },
            { icon: "calendar-clock", label: "Expired hari ini", value: "34" },
            { icon: "store", label: "Toko aktif", value: "86" }
        ],
        customerStats: [
            { icon: "users", label: "Total pelanggan", value: "2.481" },
            { icon: "user-plus", label: "Pelanggan baru", value: "124" },
            { icon: "repeat", label: "Repeat order", value: "61%" },
            { icon: "star", label: "Rating rata-rata", value: "4.8" }
        ],
        invoiceStats: [
            { icon: "receipt", label: "Total faktur", value: "412" },
            { icon: "check-circle", label: "Lunas", value: "389" },
            { icon: "clock", label: "Menunggu", value: "18" },
            { icon: "x-circle", label: "Gagal", value: "5" }
        ],
        supportStats: [
            { icon: "ticket", label: "Total tiket", value: "73" },
            { icon: "clock", label: "Open", value: "12" },
            { icon: "loader", label: "Diproses", value: "18" },
            { icon: "check-circle", label: "Selesai", value: "43" }
        ],
        activities: [
            { icon: "shopping-bag", title: "Pesanan baru #ORD-456BB", desc: "Croissant Butter menunggu pickup jam 19:00 WIB" },
            { icon: "store", title: "Profil toko diperbarui", desc: "Informasi Bumi Bakery berhasil diperbarui" },
            { icon: "check-circle", title: "Pickup selesai", desc: "Double Cheese Burger sudah diambil pelanggan" },
            { icon: "message-square", title: "Pesan pelanggan", desc: "Ada 3 pesan baru yang perlu dibalas" }
        ],
        categories: [
            { label: "Bakery", value: "42%" },
            { label: "Ready Meal", value: "31%" },
            { label: "Sayur & Buah", value: "18%" },
            { label: "Dairy", value: "9%" }
        ],
        orders: [
            orderSeed("Croissant Butter", "#ORD-456BB", "Rp 15.000", "Diproses", "yellow", "19:00 WIB", foodImages.croissant),
            orderSeed("Chicken Katsu Bento", "#ORD-748BB", "Rp 25.000", "Diproses", "yellow", "20:00 WIB", foodImages.bento),
            orderSeed("Box of 6 Donuts", "#ORD-832BB", "Rp 24.000", "Diproses", "yellow", "21:30 WIB", foodImages.donuts),
            orderSeed("Healthy Mix Salad", "#ORD-919BB", "Rp 22.500", "Selesai", "green", "18:00 WIB", foodImages.salad),
            orderSeed("Double Cheese Burger", "#ORD-126BB", "Rp 20.000", "Selesai", "green", "20:30 WIB", foodImages.burger),
            orderSeed("Vegan Salad Bowl", "#ORD-337BB", "Rp 25.000", "Dibatalkan", "red", "19:30 WIB", foodImages.vegetables)
        ],
        inventory: [
            inventorySeed("Croissant Butter", "Bakery", "Bumi Bakery", "18 pcs", "Hari ini, 22:00", "Tersedia", "green", foodImages.croissant),
            inventorySeed("Ayam Penyet Ricebowl", "Ready Meal", "Warung Mantap", "6 pcs", "Hari ini, 21:00", "Hampir habis", "yellow", foodImages.ricebowl),
            inventorySeed("Vegan Salad Bowl", "Vegetables", "Green Bowl", "0 pcs", "Hari ini, 18:30", "Expired", "red", foodImages.vegetables)
        ],
        customers: [
            customerSeed("Raka Pratama", "Purwokerto", "raka@email.com", "18", "Hari ini", "Aktif", "green"),
            customerSeed("Nabila Putri", "Banyumas", "nabila@email.com", "9", "Kemarin", "Aktif", "green"),
            customerSeed("Dimas Arya", "Sokaraja", "dimas@email.com", "3", "7 hari lalu", "Pasif", "gray")
        ],
        messages: [
            { name: "Raka Pratama", msg: "Apakah pickup bisa jam 20:30?" },
            { name: "Customer Service RESQ", msg: "Stok croissant sudah kami bantu cek." },
            { name: "Nabila Putri", msg: "Kode pickup saya tidak muncul." }
        ],
        products: [
            productSeed("Croissant Butter", "Rp 15.000", "Aktif", foodImages.croissant),
            productSeed("Chicken Katsu Bento", "Rp 25.000", "Aktif", foodImages.bento),
            productSeed("Box of 6 Donuts", "Rp 24.000", "Aktif", foodImages.donuts),
            productSeed("Vegan Salad Bowl", "Rp 25.000", "Draft", foodImages.vegetables)
        ],
        integrations: [
            { icon: "credit-card", title: "Payment Gateway", desc: "Integrasi pembayaran QRIS, e-wallet, dan transfer bank", status: "Terhubung" },
            { icon: "mail", title: "Email Notification", desc: "Kirim email otomatis untuk invoice dan pickup code", status: "Terhubung" },
            { icon: "bar-chart-3", title: "Analytics", desc: "Pantau performa conversion dan order harian", status: "Belum aktif" },
            { icon: "message-circle", title: "WhatsApp API", desc: "Kirim pengingat pickup otomatis ke pelanggan", status: "Belum aktif" },
            { icon: "database", title: "Firebase", desc: "Autentikasi dan penyimpanan data aplikasi", status: "Terhubung" },
            { icon: "map-pin", title: "Maps Service", desc: "Menampilkan toko terdekat dari lokasi pelanggan", status: "Terhubung" }
        ],
        invoices: [
            { number: "#INV-2026-001", customer: "Raka Pratama", total: "Rp 40.000", date: "08 Jun 2026", status: "Lunas", color: "green" },
            { number: "#INV-2026-002", customer: "Nabila Putri", total: "Rp 25.000", date: "08 Jun 2026", status: "Menunggu", color: "yellow" },
            { number: "#INV-2026-003", customer: "Dimas Arya", total: "Rp 20.000", date: "07 Jun 2026", status: "Gagal", color: "red" }
        ],
        tickets: [
            { id: "#TCK-001", subject: "Kode pickup tidak muncul", sender: "Nabila Putri", priority: "Tinggi", priorityColor: "red", status: "Open", statusColor: "yellow" },
            { id: "#TCK-002", subject: "Produk sudah habis", sender: "Bumi Bakery", priority: "Sedang", priorityColor: "yellow", status: "Diproses", statusColor: "blue" },
            { id: "#TCK-003", subject: "Refund pembayaran", sender: "Dimas Arya", priority: "Tinggi", priorityColor: "red", status: "Selesai", statusColor: "green" }
        ],
        helpArticles: [
            { icon: "book-open", title: "Cara mengelola pesanan", desc: "Panduan memproses pesanan sampai pickup selesai." },
            { icon: "store", title: "Mengatur profil toko", desc: "Langkah memperbarui data toko mitra di RESQ." },
            { icon: "receipt", title: "Mengelola faktur", desc: "Cara membaca status invoice dan settlement." },
            { icon: "package", title: "Mengatur stok surplus", desc: "Panduan update stok dan expired time produk." },
            { icon: "shield-check", title: "Keamanan akun", desc: "Tips menjaga akses pengelola mitra tetap aman." },
            { icon: "message-square", title: "Template balasan", desc: "Contoh balasan untuk keluhan pelanggan umum." }
        ]
    };
}

function orderSeed(name, sub, price, status, color, pickup, img) {
    return { product: { img, name, sub }, price, status, color, pickup };
}

function inventorySeed(name, sub, store, stock, expired, status, color, img) {
    return { product: { img, name, sub }, store, stock, expired, status, color };
}

function customerSeed(name, sub, email, orders, lastActive, status, statusColor) {
    return { name, initials: getInitials(name), sub, email, orders, lastActive, status, statusColor };
}

function productSeed(name, price, status, img) {
    return { name, price, status, img };
}
