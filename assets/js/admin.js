import { initAdminPage } from "./admin-shell.js";
import {
    emptyRow,
    filterDataForPartner,
    formatDate,
    getCustomerName,
    getInitials,
    getPrimaryStoreName,
    getStatusStyle,
    isPickedUp,
    isWaitingPickup,
    loadAdminData
} from "./admin-data.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

initAdminPage("dashboard", loadDashboard);

async function loadDashboard(user, partnerProfile) {
    const subtitle = byId("dashboard-subtitle");
    const recentOrdersBody = byId("recent-orders-body");

    try {
        const { menus, orders } = filterDataForPartner(await loadAdminData(), partnerProfile);
        const storeName = getPrimaryStoreName(menus, orders);

        document.title = `RESQ - Dashboard ${storeName}`;
        subtitle.innerText = `Pantau menu surplus, stok, dan pesanan pickup untuk ${storeName}.`;

        updateStats(menus, orders);
        renderRecentOrders(menus, orders);
    } catch (error) {
        console.error("Admin dashboard error:", error);
        subtitle.innerText = "Gagal memuat data. Pastikan akun toko punya akses baca ke menu dan pesanan.";
        recentOrdersBody.innerHTML = emptyRow("Gagal memuat data dari Firebase.");
    }
}

function updateStats(menus, orders) {
    const activeOrders = orders.filter((order) => !isPickedUp(order.status));
    const waitingPickup = orders.filter((order) => isWaitingPickup(order.status));
    const totalStock = menus.reduce((sum, item) => sum + item.stock, 0);

    byId("stat-total-menu").innerText = menus.length.toLocaleString("id-ID");
    byId("stat-total-stock").innerText = totalStock.toLocaleString("id-ID");
    byId("stat-active-orders").innerText = activeOrders.length.toLocaleString("id-ID");
    byId("stat-waiting-pickup").innerText = waitingPickup.length.toLocaleString("id-ID");
}

function renderRecentOrders(menus, orders) {
    const recentOrdersBody = byId("recent-orders-body");

    if (!orders.length) {
        recentOrdersBody.innerHTML = renderMenuFallback(menus);
        return;
    }

    const recentOrders = [...orders]
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .slice(0, 5);

    recentOrdersBody.innerHTML = recentOrders.map(orderRow).join("");
}

function renderMenuFallback(menus) {
    if (!menus.length) return emptyRow("Belum ada menu atau pesanan di database.");

    return menus.slice(0, 5).map((menu) => {
        const initials = getInitials(menu.restaurantId);

        return `
            <tr class="transition hover:bg-slate-50">
                <td class="px-6 py-5">
                    <div class="flex items-center gap-4">
                        <span class="grid h-10 w-10 place-items-center rounded-full bg-resqBlue text-sm font-bold text-resqYellow">${escapeHtml(initials)}</span>
                        <div>
                            <p class="text-sm font-bold text-resqNavy">${escapeHtml(menu.restaurantId)}</p>
                            <p class="mt-1 text-xs font-medium text-slate-500">Toko partner</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <p class="text-sm font-bold text-resqNavy">${escapeHtml(menu.name)}</p>
                    <p class="mt-1 text-xs font-medium text-slate-500">${formatRupiah(menu.price)}</p>
                </td>
                <td class="px-6 py-5">
                    <p class="text-sm font-medium text-resqNavy">Stok tersedia</p>
                    <p class="mt-1 text-xs font-medium text-slate-500">${menu.stock.toLocaleString("id-ID")} porsi</p>
                </td>
                <td class="px-6 py-5">
                    <span class="inline-flex rounded-full ${menu.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} px-3 py-1 text-xs font-bold">
                        ${menu.stock > 0 ? "Tersedia" : "Stok Habis"}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

function orderRow(order) {
    const initials = getInitials(order.customerEmail);
    const status = getStatusStyle(order.status);

    return `
        <tr class="transition hover:bg-slate-50">
            <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                    <span class="grid h-10 w-10 place-items-center rounded-full bg-resqBlue text-sm font-bold text-resqYellow">${escapeHtml(initials)}</span>
                    <div>
                        <p class="text-sm font-bold text-resqNavy">${escapeHtml(getCustomerName(order.customerEmail))}</p>
                        <p class="mt-1 text-xs font-medium text-slate-500">${escapeHtml(order.customerEmail)}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-5">
                <p class="text-sm font-bold text-resqNavy">${escapeHtml(order.productName)}</p>
                <p class="mt-1 text-xs font-medium text-slate-500">${escapeHtml(order.restaurantId)} &middot; ${formatRupiah(order.totalPrice)}</p>
            </td>
            <td class="px-6 py-5">
                <p class="text-sm font-medium text-resqNavy">${formatDate(order.timestamp)}</p>
                <p class="mt-1 text-xs font-medium ${status.isWarning ? "text-red-500" : "text-slate-500"}">Kode: ${escapeHtml(order.pickupCode)}</p>
            </td>
            <td class="px-6 py-5">
                <span class="inline-flex rounded-full ${status.className} px-3 py-1 text-xs font-bold">${escapeHtml(status.label)}</span>
            </td>
        </tr>
    `;
}
