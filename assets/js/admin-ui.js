import { escapeHtml } from "./utils.js";

export const screenNames = {
    dashboard: "Dashboard Mitra",
    pesanan: "Pesanan",
    inventori: "Inventori",
    pelanggan: "Pelanggan",
    pesan: "Pesan",
    produk: "Produk",
    pengaturan: "Pengaturan",
    support: "Bantuan RESQ",
    "pusat-bantuan": "Pusat Bantuan"
};

export const navGroups = [
    {
        title: "Menu",
        items: [
            ["dashboard", "layout-grid", "Dashboard Mitra"],
            ["pesanan", "shopping-bag", "Pesanan"],
            ["inventori", "store", "Inventori"],
            ["pelanggan", "users", "Pelanggan"],
            ["pesan", "message-square", "Pesan"]
        ]
    },
    {
        title: "Lainnya",
        items: [
            ["produk", "package", "Produk"]
        ]
    },
    {
        title: "Tools",
        items: [
            ["pengaturan", "settings", "Pengaturan"],
            ["support", "headphones", "Bantuan RESQ"],
            ["pusat-bantuan", "help-circle", "Pusat Bantuan"]
        ]
    }
];

export function icon(name, cls = "h-5 w-5") {
    return `<i data-lucide="${name}" class="${cls}"></i>`;
}

export function renderSidebar() {
    return navGroups.map((group) => `
        <div>
            <p class="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">${group.title}</p>
            <ul class="space-y-1">
                ${group.items.map(([target, itemIcon, label], index) => `
                    <li>
                        <button data-target="${target}" class="nav-link ${index === 0 && group.title === "Menu" ? "nav-active" : "text-gray-600 hover:bg-gray-50 font-medium"} flex w-full items-center space-x-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors">
                            ${icon(itemIcon)}
                            <span>${label}</span>
                        </button>
                    </li>
                `).join("")}
            </ul>
        </div>
    `).join("");
}

export function renderMobileNav() {
    return `<div class="flex gap-2 overflow-x-auto pb-1">${navGroups.flatMap((group) => group.items).map(([target, itemIcon, label], index) => `
        <button data-target="${target}" class="nav-link ${index === 0 ? "nav-active" : "text-gray-600"} flex shrink-0 items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs font-semibold">
            ${icon(itemIcon, "h-4 w-4")}
            <span>${label}</span>
        </button>
    `).join("")}</div>`;
}

export function renderScreens(data) {
    return Object.keys(screenNames).map((screen, index) => `
        <section id="${screen}" class="screen ${index === 0 ? "active" : ""}">
            ${screenRenderer[screen](data)}
        </section>
    `).join("");
}

function pageHeader(screen, title, subtitle, action = "") {
    return `
        <div class="mb-6">${breadcrumb(screen)}</div>
        <header class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 class="mb-1 text-2xl font-bold">${title}</h1>
                <p class="text-sm text-gray-500">${subtitle}</p>
            </div>
            ${action}
        </header>
    `;
}

function breadcrumb(screen) {
    return `
        <div class="flex items-center space-x-2 text-sm font-medium text-gray-500">
            ${icon("home", "h-4 w-4")}
            <span>Menu</span>
            ${icon("chevron-right", "h-4 w-4 text-gray-300")}
            <span class="font-semibold text-resq-navy">${screenNames[screen]}</span>
        </div>
    `;
}

function statGrid(items, cols = "lg:grid-cols-4") {
    return `<div class="mb-8 grid gap-4 sm:grid-cols-2 ${cols}">${items.map(statCard).join("")}</div>`;
}

function statCard(item) {
    return `
        <article class="flex min-h-32 flex-col justify-between rounded-xl border border-gray-200 bg-resq-white p-5 transition-colors hover:border-resq-navy">
            <div class="mb-3 flex items-center space-x-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600">${icon(item.icon)}</div>
                <span class="text-sm font-medium text-gray-600">${item.label}</span>
            </div>
            <h3 class="text-2xl font-bold text-resq-navy">${item.value}</h3>
        </article>
    `;
}

function tabs(items) {
    return `
        <div class="mb-6 flex items-center space-x-8 overflow-x-auto border-b border-gray-200">
            ${items.map((item, index) => `
                <button class="shrink-0 border-b-2 pb-3 text-sm transition-colors ${index === 0 ? "border-resq-navy font-bold text-resq-navy" : "border-transparent font-medium text-gray-500 hover:text-resq-navy"}">
                    ${item.label} <span class="ml-1 font-medium ${index === 0 ? "text-gray-500" : "text-gray-400"}">${item.count}</span>
                </button>
            `).join("")}
        </div>
    `;
}

function toolbar(placeholder) {
    return `
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="relative w-full sm:w-80">
                ${icon("search", "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400")}
                <input type="text" placeholder="${placeholder}" class="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-resq-navy focus:ring-1 focus:ring-resq-navy">
            </div>
            <button class="inline-flex items-center justify-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                ${icon("sliders-horizontal", "h-4 w-4")}
                <span>Filter</span>
            </button>
        </div>
    `;
}

function table(headers, rows) {
    return `
        <div class="w-full overflow-x-auto bg-resq-white">
            <table class="w-full min-w-[760px] border-collapse text-left">
                <thead>
                    <tr class="border-b border-gray-100 text-sm font-medium text-gray-500">
                        ${headers.map((header) => `<th class="py-3 pl-4 font-medium">${header}</th>`).join("")}
                    </tr>
                </thead>
                <tbody class="text-sm">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function row(cells) {
    return `<tr class="group border-b border-gray-50 transition-colors hover:bg-gray-50/50">${cells.map((cell) => `<td class="py-4 pl-4 font-medium text-gray-600">${cell}</td>`).join("")}</tr>`;
}

function productCell(product) {
    return `
        <div class="flex items-center space-x-4">
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                <img src="${product.img}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover">
            </div>
            <div>
                <p class="font-bold text-resq-navy">${escapeHtml(product.name)}</p>
                <p class="text-xs text-gray-500">${escapeHtml(product.sub || "Surplus food")}</p>
            </div>
        </div>
    `;
}

function personCell(person) {
    return `
        <div class="flex items-center space-x-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-resq-yellow font-bold text-resq-navy">${escapeHtml(person.initials)}</div>
            <div>
                <p class="font-bold text-resq-navy">${escapeHtml(person.name)}</p>
                <p class="text-xs text-gray-500">${escapeHtml(person.sub)}</p>
            </div>
        </div>
    `;
}

function badge(color, text) {
    const styles = {
        yellow: "bg-resq-yellow/20 text-resq-navy",
        green: "bg-green-100 text-green-700",
        blue: "bg-blue-100 text-blue-700",
        red: "bg-red-100 text-red-700",
        gray: "bg-gray-100 text-gray-600"
    };
    return `<span class="inline-flex rounded-md px-3 py-1.5 text-[11px] font-bold ${styles[color] || styles.gray}">${escapeHtml(text)}</span>`;
}

function renderDashboard(data) {
    const stats = [
        { icon: "shopping-bag", label: "Total pesanan", value: data.metrics.totalOrders },
        { icon: "shopping-bag", label: "Pesanan aktif", value: data.metrics.activeOrders },
        { icon: "leaf", label: "Makanan terselamatkan", value: data.metrics.savedFood },
        { icon: "wallet", label: "Pendapatan", value: data.metrics.revenue }
    ];

    return `
        ${pageHeader("dashboard", "Dashboard Mitra", "Ringkasan operasional toko mitra di platform RESQ", `
            <button class="inline-flex items-center justify-center space-x-2 rounded-lg bg-resq-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                ${icon("download", "h-4 w-4")}
                <span>Export Report</span>
            </button>
        `)}
        ${statGrid(stats)}
        <div class="grid gap-6 lg:grid-cols-3">
            <section class="rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <div class="mb-5 flex items-center justify-between">
                    <h3 class="font-bold">Aktivitas terbaru</h3>
                    <span class="text-xs text-gray-500">Hari ini</span>
                </div>
                <div class="space-y-4">
                    ${data.activities.map((activity) => `
                        <div class="flex items-center gap-4">
                            <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600">${icon(activity.icon)}</div>
                            <div>
                                <p class="text-sm font-bold">${escapeHtml(activity.title)}</p>
                                <p class="mt-1 text-xs text-gray-500">${escapeHtml(activity.desc)}</p>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </section>
            <section class="rounded-xl border border-gray-200 p-5">
                <h3 class="mb-5 font-bold">Kategori populer</h3>
                <div class="space-y-4">
                    ${data.categories.map((category) => `
                        <div>
                            <div class="mb-2 flex justify-between text-sm">
                                <span class="font-semibold">${category.label}</span>
                                <span class="text-gray-500">${category.value}</span>
                            </div>
                            <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div class="h-full rounded-full bg-resq-yellow" style="width:${category.value}"></div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </section>
        </div>
    `;
}

function renderOrders(data) {
    const orderStats = buildOrderStats(data.orders);

    return `
        ${pageHeader("pesanan", "Pesanan", "Kelola pesanan makanan surplus dari pelanggan toko Anda")}
        <section id="orders-page" data-orders-page>
            <div id="order-stats-grid">
                ${statGrid(orderStats)}
            </div>

            <div id="order-tabs" class="mb-6 flex items-center space-x-8 overflow-x-auto border-b border-gray-200">
                ${["Semua", "Selesai", "Diproses", "Dibatalkan"].map((status, index) => `
                    <button type="button" data-order-status="${status}" class="order-tab shrink-0 cursor-pointer border-b-2 pb-3 text-sm transition-all duration-200 ${index === 0 ? "border-resq-navy font-bold text-resq-navy" : "border-transparent font-medium text-gray-500 hover:text-resq-navy"}">
                        ${status} <span data-order-tab-count="${status}" class="ml-1 font-medium ${index === 0 ? "text-gray-500" : "text-gray-400"}">0</span>
                    </button>
                `).join("")}
            </div>

            <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="relative w-full sm:w-80">
                    ${icon("search", "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400")}
                    <input id="order-search" type="search" placeholder="Cari produk atau kode pesanan..." class="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-resq-navy focus:ring-1 focus:ring-resq-navy">
                </div>
                <div class="relative">
                    <button id="order-filter-button" type="button" class="inline-flex cursor-pointer items-center justify-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-resq-navy">
                        ${icon("sliders-horizontal", "h-4 w-4")}
                        <span>Filter</span>
                    </button>
                    <div id="order-filter-menu" class="absolute right-0 z-20 mt-2 hidden w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg transition-all duration-200">
                        ${["Terbaru", "Terlama", "Harga terendah", "Harga tertinggi"].map((label) => `
                            <button type="button" data-order-sort="${label}" class="block w-full cursor-pointer px-4 py-2 text-left text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50 hover:text-resq-navy">${label}</button>
                        `).join("")}
                    </div>
                </div>
            </div>

            <div id="order-action-bar" class="mb-4 hidden items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200">
                <p class="text-sm font-semibold text-gray-600"><span id="selected-order-count">0</span> pesanan dipilih</p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" data-order-bulk="complete" class="cursor-pointer rounded-lg bg-resq-navy px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90">Tandai selesai</button>
                    <button type="button" data-order-bulk="cancel" class="cursor-pointer rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-50">Batalkan pesanan</button>
                    <button type="button" data-order-bulk="clear" class="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-50">Hapus pilihan</button>
                </div>
            </div>

            <div class="w-full overflow-x-auto rounded-xl border border-gray-200 bg-resq-white shadow-sm">
                <table class="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                        <tr class="border-b border-gray-100 text-sm font-medium text-gray-500">
                            ${["", "Nama Produk", "Harga", "Status", "Jadwal Pickup"].map((header) => `<th class="py-3 pl-4 font-medium">${header}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody id="orders-table-body" class="text-sm"></tbody>
                </table>
                <p id="orders-empty-state" class="hidden px-5 py-8 text-center text-sm font-semibold text-gray-500">Tidak ada pesanan yang cocok.</p>
            </div>
        </section>

        <div id="order-detail-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-resq-navy/40 p-4 opacity-0 transition-opacity duration-200">
            <div class="w-full max-w-md scale-95 rounded-xl border border-gray-200 bg-white p-5 shadow-xl transition-transform duration-200">
                <div class="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">Detail Pesanan</p>
                        <h3 id="modal-order-name" class="mt-1 text-xl font-bold text-resq-navy"></h3>
                    </div>
                    <button id="order-modal-close-icon" type="button" class="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-gray-200 text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-resq-navy" aria-label="Tutup modal">
                        ${icon("x", "h-4 w-4")}
                    </button>
                </div>
                <dl class="space-y-3 text-sm">
                    <div class="flex justify-between gap-4 border-b border-gray-100 pb-3"><dt class="text-gray-500">Kode pesanan</dt><dd id="modal-order-code" class="font-bold text-resq-navy"></dd></div>
                    <div class="flex justify-between gap-4 border-b border-gray-100 pb-3"><dt class="text-gray-500">Harga</dt><dd id="modal-order-price" class="font-bold text-resq-navy"></dd></div>
                    <div class="flex justify-between gap-4 border-b border-gray-100 pb-3"><dt class="text-gray-500">Status</dt><dd id="modal-order-status"></dd></div>
                    <div class="flex justify-between gap-4"><dt class="text-gray-500">Jadwal pickup</dt><dd id="modal-order-pickup" class="font-bold text-resq-navy"></dd></div>
                </dl>
                <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button id="order-modal-close" type="button" class="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-50">Tutup</button>
                    <button id="order-modal-complete" type="button" class="cursor-pointer rounded-lg bg-resq-navy px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90">Tandai selesai</button>
                </div>
            </div>
        </div>
    `;
}

function buildOrderStats(orders) {
    return [
        { icon: "box", label: "Total pesanan", value: orders.length.toLocaleString("id-ID") },
        { icon: "clock", label: "Menunggu pickup", value: orders.filter((order) => getOrderStatusGroup(order.status) === "Diproses").length.toLocaleString("id-ID") },
        { icon: "x-octagon", label: "Dibatalkan", value: orders.filter((order) => getOrderStatusGroup(order.status) === "Dibatalkan").length.toLocaleString("id-ID") },
        { icon: "shopping-bag", label: "Pesanan selesai", value: orders.filter((order) => getOrderStatusGroup(order.status) === "Selesai").length.toLocaleString("id-ID") }
    ];
}

function getOrderStatusGroup(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("selesai") || normalized.includes("diambil") || normalized.includes("picked") || normalized.includes("complete")) return "Selesai";
    if (normalized.includes("batal") || normalized.includes("cancel") || normalized.includes("gagal")) return "Dibatalkan";
    return "Diproses";
}

function renderInventory(data) {
    return `
        ${pageHeader("inventori", "Inventori", "Pantau stok surplus yang tersedia di toko Anda")}
        ${statGrid(data.inventoryStats)}
        ${tabs([{ label: "Semua", count: 312 }, { label: "Tersedia", count: 259 }, { label: "Hampir Habis", count: 19 }, { label: "Expired", count: 34 }])}
        ${toolbar("Cari stok produk...")}
        ${table(["Produk", "Mitra", "Stok", "Expired", "Status"], data.inventory.map((item) => row([
            productCell(item.product),
            item.store,
            item.stock,
            item.expired,
            badge(item.color, item.status)
        ])).join(""))}
    `;
}

function renderCustomers(data) {
    return `
        ${pageHeader("pelanggan", "Pelanggan", "Lihat pelanggan dan riwayat pembelian di toko Anda")}
        ${statGrid(data.customerStats)}
        ${toolbar("Cari pelanggan...")}
        ${table(["Nama Pelanggan", "Email", "Total Pesanan", "Terakhir Aktif", "Status"], data.customers.map((customer) => row([
            personCell(customer),
            customer.email,
            customer.orders,
            customer.lastActive,
            badge(customer.statusColor, customer.status)
        ])).join(""))}
    `;
}

function renderMessages(data) {
    return `
        ${pageHeader("pesan", "Pesan", "Kelola chat pelanggan dan koordinasi dengan customer service RESQ")}
        <div class="grid gap-6 lg:grid-cols-3">
            <section class="rounded-xl border border-gray-200 p-4">
                ${toolbar("Cari pesan...")}
                <div class="space-y-2">
                    ${data.messages.map((message, index) => `
                        <button class="w-full rounded-xl border p-3 text-left transition-colors ${index === 0 ? "border-resq-navy bg-gray-50" : "border-gray-100 hover:bg-gray-50"}">
                            <p class="text-sm font-bold">${escapeHtml(message.name)}</p>
                            <p class="mt-1 truncate text-xs text-gray-500">${escapeHtml(message.msg)}</p>
                        </button>
                    `).join("")}
                </div>
            </section>
            <section class="flex min-h-[520px] flex-col rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <div class="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                        <h3 class="font-bold">Raka Pratama</h3>
                        <p class="text-xs text-gray-500">Pelanggan - Online</p>
                    </div>
                    ${badge("green", "Aktif")}
                </div>
                <div class="flex-1 space-y-3">
                    <div class="max-w-md rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">Halo kak, apakah pickup bisa jam 20:30?</div>
                    <div class="ml-auto max-w-md rounded-xl bg-resq-navy px-4 py-3 text-sm text-white">Bisa kak, silakan datang sebelum toko tutup jam 21:00.</div>
                    <div class="max-w-md rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">Oke, terima kasih kak.</div>
                </div>
                <div class="mt-5 flex gap-3">
                    <input class="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-colors focus:border-resq-navy focus:ring-1 focus:ring-resq-navy" placeholder="Tulis balasan...">
                    <button class="inline-flex items-center justify-center rounded-lg bg-resq-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">${icon("send", "h-4 w-4")}</button>
                </div>
            </section>
        </div>
    `;
}

function renderProducts(data) {
    return `
        ${pageHeader("produk", "Produk", "Kelola katalog produk surplus toko Anda", `
            <button data-focus-product-form class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-resq-navy px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                ${icon("plus", "h-4 w-4")}
                <span>Tambah Produk</span>
            </button>
        `)}
        ${tabs([{ label: "Semua", count: 128 }, { label: "Bakery", count: 38 }, { label: "Ready Meal", count: 42 }, { label: "Vegetables", count: 29 }, { label: "Dairy", count: 19 }])}
        ${toolbar("Cari produk...")}

        <section id="partner-product-form" class="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h3 class="text-lg font-bold text-resq-navy">Upload makanan surplus</h3>
                <p class="mt-1 text-sm text-gray-500">Menu yang disimpan di sini akan muncul di halaman user.</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label class="text-sm font-semibold text-resq-navy">Nama makanan
                    <input id="partner-menu-name" class="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-resq-navy" placeholder="Croissant Butter">
                </label>
                <label class="text-sm font-semibold text-resq-navy">Kategori
                    <select id="partner-menu-category" class="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-resq-navy">
                        <option value="Ready Meal">Ready Meal</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Sayur & Buah">Sayur & Buah</option>
                        <option value="Dairy">Dairy</option>
                    </select>
                </label>
                <label class="text-sm font-semibold text-resq-navy">Harga surplus
                    <input id="partner-menu-price" type="number" min="0" class="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-resq-navy" placeholder="15000">
                </label>
                <label class="text-sm font-semibold text-resq-navy">Stok porsi
                    <input id="partner-menu-stock" type="number" min="1" class="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-resq-navy" placeholder="10">
                </label>
            </div>
            <div class="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label class="text-sm font-semibold text-resq-navy">Expired / pickup terakhir
                    <input id="partner-menu-expired" class="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-resq-navy" placeholder="Hari ini, 22:00">
                </label>
                <label class="text-sm font-semibold text-resq-navy">Foto makanan
                    <input id="partner-menu-image" type="file" accept="image/*" class="mt-2 block w-full text-sm font-semibold text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-resq-navy file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white">
                </label>
                <button id="btn-save-partner-menu" class="h-11 rounded-lg bg-resq-navy px-5 text-sm font-bold text-white transition hover:opacity-90">Simpan menu</button>
            </div>
            <p id="partner-menu-message" class="mt-4 hidden rounded-lg px-4 py-3 text-sm font-semibold"></p>
        </section>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            ${data.products.map((product) => `
                <article class="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-resq-navy">
                    <img src="${product.img}" class="h-36 w-full object-cover" alt="${escapeHtml(product.name)}">
                    <div class="p-4">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <h3 class="text-sm font-bold">${escapeHtml(product.name)}</h3>
                                <p class="mt-1 text-xs text-gray-500">Surplus food</p>
                            </div>
                            ${badge(product.status === "Aktif" ? "green" : "gray", product.status)}
                        </div>
                        <p class="mt-4 font-bold">${product.price}</p>
                    </div>
                </article>
            `).join("")}
        </div>
    `;
}

function renderSettings() {
    return `
        ${pageHeader("pengaturan", "Pengaturan", "Atur profil pengelola mitra, brand toko, dan preferensi operasional")}
        <div class="grid gap-6 lg:grid-cols-3">
            <section class="rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <h3 class="mb-5 font-bold">Informasi akun</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                    ${["Nama pengelola:Faza Fahri", "Email:mitra@resq.com", "Role:Pengelola Mitra", "Nomor HP:+62 812 0000 0000"].map((item) => {
                        const [label, value] = item.split(":");
                        return `<label class="text-sm font-semibold text-resq-navy">${label}<input value="${value}" class="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-colors focus:border-resq-navy focus:ring-1 focus:ring-resq-navy"></label>`;
                    }).join("")}
                </div>
                <button class="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-resq-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Simpan Perubahan</button>
            </section>
            <section class="rounded-xl border border-gray-200 p-5">
                <h3 class="mb-5 font-bold">Design System</h3>
                <div class="space-y-4">
                    <div><p class="mb-2 text-xs text-gray-500">Primary</p><div class="h-10 rounded-lg border border-gray-200 bg-resq-yellow"></div><p class="mt-2 text-xs font-semibold">#F0C807</p></div>
                    <div><p class="mb-2 text-xs text-gray-500">Secondary</p><div class="h-10 rounded-lg bg-resq-navy"></div><p class="mt-2 text-xs font-semibold">#011837</p></div>
                </div>
            </section>
        </div>
    `;
}

function renderSupport(data) {
    return `
        ${pageHeader("support", "Bantuan RESQ", "Hubungi customer service RESQ untuk bantuan operasional toko")}
        ${statGrid(data.supportStats)}
        <section class="mb-8 rounded-xl border border-gray-200 bg-resq-white p-5 shadow-sm">
            <div class="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 class="text-lg font-bold text-resq-navy">Kirim pesan ke admin RESQ</h2>
                    <p class="mt-1 text-sm text-gray-500">Pesan akan ditujukan ke <span class="font-semibold text-resq-navy">admin123@gmail.com</span>.</p>
                </div>
                <div class="inline-flex w-fit items-center gap-2 rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700">
                    ${icon("mail", "h-4 w-4")}
                    Email admin
                </div>
            </div>
            <div id="support-message-form" class="grid gap-4">
                <div class="grid gap-4 md:grid-cols-[1fr_180px]">
                    <label class="block">
                        <span class="mb-2 block text-sm font-semibold text-gray-700">Subjek</span>
                        <input id="support-message-subject" type="text" class="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-resq-navy focus:ring-2 focus:ring-resq-navy/10" placeholder="Contoh: Bantuan verifikasi toko">
                    </label>
                    <label class="block">
                        <span class="mb-2 block text-sm font-semibold text-gray-700">Prioritas</span>
                        <select id="support-message-priority" class="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-resq-navy focus:ring-2 focus:ring-resq-navy/10">
                            <option>Normal</option>
                            <option>Tinggi</option>
                            <option>Darurat</option>
                        </select>
                    </label>
                </div>
                <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-gray-700">Isi pesan</span>
                    <textarea id="support-message-body" rows="5" class="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-resq-navy focus:ring-2 focus:ring-resq-navy/10" placeholder="Tulis kendala atau pertanyaan untuk admin RESQ..."></textarea>
                </label>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p id="support-message-status" class="hidden rounded-lg px-4 py-3 text-sm font-semibold"></p>
                    <button id="btn-send-support-message" type="button" class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-resq-navy px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        ${icon("send", "h-4 w-4")}
                        Kirim pesan
                    </button>
                </div>
            </div>
        </section>
        ${toolbar("Cari tiket support...")}
        ${table(["ID Tiket", "Subjek", "Pengirim", "Prioritas", "Status"], data.tickets.map((ticket) => row([
            ticket.id,
            ticket.subject,
            ticket.sender,
            badge(ticket.priorityColor, ticket.priority),
            badge(ticket.statusColor, ticket.status)
        ])).join(""))}
    `;
}

function renderHelpCenter(data) {
    return `
        ${pageHeader("pusat-bantuan", "Pusat Bantuan", "Artikel panduan untuk pengelola mitra dan pelanggan")}
        ${toolbar("Cari artikel bantuan...")}
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            ${data.helpArticles.map((article) => `
                <article class="cursor-pointer rounded-xl border border-gray-200 p-5 transition-colors hover:border-resq-navy">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600">${icon(article.icon)}</div>
                    <h3 class="mb-2 font-bold">${escapeHtml(article.title)}</h3>
                    <p class="text-sm leading-relaxed text-gray-500">${escapeHtml(article.desc)}</p>
                </article>
            `).join("")}
        </div>
    `;
}

const screenRenderer = {
    dashboard: renderDashboard,
    pesanan: renderOrders,
    inventori: renderInventory,
    pelanggan: renderCustomers,
    pesan: renderMessages,
    produk: renderProducts,
    pengaturan: renderSettings,
    support: renderSupport,
    "pusat-bantuan": renderHelpCenter
};
