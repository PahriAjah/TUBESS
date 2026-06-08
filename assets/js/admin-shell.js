import { auth, signOut } from "./firebase.js";
import { getPartnerProfile, isPartnerAccount, requireAuth } from "./auth-flow.js";
import {
    filterDataForPartner,
    formatDate,
    getCustomerName,
    isPickedUp,
    isWaitingPickup,
    loadAdminData
} from "./admin-data.js";
import { byId } from "./utils.js";

export function initAdminPage(_pageKey, onReady) {
    setupLogout();
    setupNotifications();

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
        await renderNotifications(partnerProfile);
        await onReady(user, partnerProfile);
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

function setupNotifications() {
    const button = document.querySelector('button[aria-label="Notifications"]');
    if (!button || byId("notification-panel")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "relative";
    button.parentElement.insertBefore(wrapper, button);
    wrapper.appendChild(button);

    button.id = "btn-notifications";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.classList.add("relative", "grid", "h-10", "w-10", "place-items-center", "rounded-lg", "hover:bg-slate-100");
    button.innerHTML = `
        <i data-lucide="bell" class="h-6 w-6"></i>
        <span id="notification-badge" class="absolute right-1 top-1 hidden h-4 min-w-4 rounded-full bg-resqYellow px-1 text-[10px] font-black leading-4 text-resqBlue ring-2 ring-white"></span>
    `;

    wrapper.insertAdjacentHTML("beforeend", `
        <section id="notification-panel" class="pointer-events-none absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] origin-top-right translate-y-2 scale-95 overflow-hidden rounded-lg border border-slate-100 bg-white opacity-0 shadow-xl transition duration-200 ease-out" aria-live="polite">
            <div class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 class="text-sm font-black text-resqNavy">Notifikasi</h2>
                    <p id="notification-summary" class="mt-1 text-xs font-semibold text-slate-500">Memuat update toko...</p>
                </div>
                <button id="btn-read-notifications" type="button" class="text-xs font-bold text-resqBlue transition hover:opacity-70">Tandai dibaca</button>
            </div>
            <div id="notification-list" class="max-h-96 overflow-y-auto"></div>
            <div class="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <a href="admin.html" class="inline-flex text-xs font-black text-resqBlue transition hover:opacity-70">Lihat pesanan aktif</a>
            </div>
        </section>
    `);

    const panel = byId("notification-panel");
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = button.getAttribute("aria-expanded") === "true";
        toggleNotificationPanel(panel, button, !isOpen);
    });

    byId("btn-read-notifications")?.addEventListener("click", () => {
        localStorage.setItem("resq-admin-notifications-read-at", String(Date.now()));
        updateNotificationBadge(0);
        byId("notification-summary").innerText = "Semua notifikasi sudah ditandai dibaca.";
    });

    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) {
            toggleNotificationPanel(panel, button, false);
        }
    });
}

function toggleNotificationPanel(panel, button, isOpen) {
    panel.classList.toggle("pointer-events-none", !isOpen);
    panel.classList.toggle("translate-y-2", !isOpen);
    panel.classList.toggle("scale-95", !isOpen);
    panel.classList.toggle("opacity-0", !isOpen);
    panel.classList.toggle("translate-y-0", isOpen);
    panel.classList.toggle("scale-100", isOpen);
    panel.classList.toggle("opacity-100", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
}

async function renderNotifications(partnerProfile) {
    const list = byId("notification-list");
    const summary = byId("notification-summary");
    if (!list || !summary) return;

    try {
        const { menus, orders } = filterDataForPartner(await loadAdminData(), partnerProfile);
        const notifications = buildNotifications(menus, orders);

        if (!notifications.length) {
            list.innerHTML = `
                <div class="px-5 py-8 text-center">
                    <p class="text-sm font-black text-resqNavy">Belum ada notifikasi</p>
                    <p class="mt-2 text-xs font-semibold leading-5 text-slate-500">Update pesanan dan stok akan muncul di sini.</p>
                </div>
            `;
            summary.innerText = "Tidak ada update baru.";
            updateNotificationBadge(0);
            return;
        }

        list.innerHTML = notifications.map(notificationItem).join("");
        summary.innerText = `${notifications.length} update perlu dicek.`;
        updateNotificationBadge(getUnreadCount(notifications));

        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (error) {
        console.error("Notification error:", error);
        list.innerHTML = `
            <div class="px-5 py-6">
                <p class="text-sm font-black text-red-700">Gagal memuat notifikasi</p>
                <p class="mt-2 text-xs font-semibold leading-5 text-slate-500">Periksa koneksi Firebase dan coba refresh halaman.</p>
            </div>
        `;
        summary.innerText = "Notifikasi tidak tersedia.";
        updateNotificationBadge(0);
    }
}

function buildNotifications(menus, orders) {
    const waitingOrders = orders
        .filter((order) => isWaitingPickup(order.status) && !isPickedUp(order.status))
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .slice(0, 3)
        .map((order) => ({
            id: `order-${order.id}`,
            icon: "shopping-bag",
            tone: "bg-yellow-100 text-resqBlue",
            title: "Pesanan menunggu pickup",
            body: `${getCustomerName(order.customerEmail)} memesan ${order.productName}. Kode: ${order.pickupCode}.`,
            time: formatDate(order.timestamp),
            href: "admin.html",
            timestamp: Number(order.timestamp || 0)
        }));

    const stockAlerts = menus
        .filter((menu) => menu.stock <= 3)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 3)
        .map((menu) => ({
            id: `stock-${menu.id}-${menu.stock}`,
            icon: menu.stock > 0 ? "triangle-alert" : "circle-alert",
            tone: menu.stock > 0 ? "bg-yellow-100 text-resqBlue" : "bg-red-100 text-red-700",
            title: menu.stock > 0 ? "Stok hampir habis" : "Stok habis",
            body: `${menu.name} tersisa ${menu.stock.toLocaleString("id-ID")} porsi.`,
            time: "Update stok produk",
            href: "admin.html",
            timestamp: 1
        }));

    const recentOrder = orders
        .filter((order) => !isPickedUp(order.status))
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .slice(0, 1)
        .map((order) => ({
            id: `recent-${order.id}`,
            icon: "bell-ring",
            tone: "bg-green-100 text-green-700",
            title: "Pesanan aktif terbaru",
            body: `${order.productName} dari ${getCustomerName(order.customerEmail)} masih aktif.`,
            time: formatDate(order.timestamp),
            href: "admin.html",
            timestamp: Number(order.timestamp || 0)
        }));

    return [...waitingOrders, ...stockAlerts, ...recentOrder].slice(0, 6);
}

function notificationItem(item) {
    return `
        <a href="${item.href}" class="flex gap-4 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg ${item.tone}">
                <i data-lucide="${item.icon}" class="h-5 w-5"></i>
            </span>
            <span class="min-w-0">
                <span class="block text-sm font-black text-resqNavy">${escapeNotificationText(item.title)}</span>
                <span class="mt-1 block text-xs font-semibold leading-5 text-slate-500">${escapeNotificationText(item.body)}</span>
                <span class="mt-2 block text-[11px] font-bold text-slate-400">${escapeNotificationText(item.time)}</span>
            </span>
        </a>
    `;
}

function getUnreadCount(notifications) {
    const readAt = Number(localStorage.getItem("resq-admin-notifications-read-at") || 0);
    return notifications.filter((item) => item.timestamp > readAt).length;
}

function updateNotificationBadge(count) {
    const badge = byId("notification-badge");
    if (!badge) return;

    badge.innerText = count > 9 ? "9+" : String(count);
    badge.classList.toggle("hidden", count === 0);
}

function escapeNotificationText(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderPartnerProfile(profile) {
    const storeName = profile?.store_name || profile?.storeName || "Nama Toko";

    document.querySelectorAll("[data-partner-store-name]").forEach((element) => {
        element.innerText = storeName;
    });
}
