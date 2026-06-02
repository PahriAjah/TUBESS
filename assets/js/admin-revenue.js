import { initAdminPage } from "./admin-shell.js";
import { emptyRow, filterDataForPartner, formatDate, isPickedUp, loadAdminData } from "./admin-data.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

initAdminPage("revenue", loadRevenuePage);
setupRevenueSearch();

let currentRevenueOrders = [];

async function loadRevenuePage(user, partnerProfile) {
    const subtitle = byId("revenue-subtitle");
    const revenueBody = byId("revenue-body");

    try {
        const { orders } = filterDataForPartner(await loadAdminData(), partnerProfile);
        const completedOrders = orders.filter((order) => isPickedUp(order.status));
        const revenueOrders = completedOrders.length ? completedOrders : orders;
        currentRevenueOrders = revenueOrders;
        const totalRevenue = revenueOrders.reduce((sum, order) => sum + order.totalPrice, 0);
        const averageOrder = revenueOrders.length ? totalRevenue / revenueOrders.length : 0;

        byId("revenue-total").innerText = formatRupiah(totalRevenue);
        byId("revenue-order-count").innerText = revenueOrders.length.toLocaleString("id-ID");
        byId("revenue-average").innerText = formatRupiah(averageOrder);
        subtitle.innerText = "Ringkasan pendapatan dari pesanan yang tercatat di database.";

        if (!revenueOrders.length) {
            revenueBody.innerHTML = emptyRow("Belum ada transaksi pendapatan.", 5);
            return;
        }

        renderRevenue(getSearchQuery());
    } catch (error) {
        console.error("Admin revenue error:", error);
        subtitle.innerText = "Gagal memuat data pendapatan dari Firebase.";
        revenueBody.innerHTML = emptyRow("Gagal memuat data pendapatan.", 5);
    }
}

function setupRevenueSearch() {
    getSearchInput()?.addEventListener("input", () => renderRevenue(getSearchQuery()));
}

function renderRevenue(query = "") {
    const revenueBody = byId("revenue-body");
    const filteredOrders = query
        ? currentRevenueOrders.filter((order) => searchableText(
            order.productName,
            order.restaurantId,
            order.customerEmail,
            order.totalPrice,
            order.paymentMethod,
            order.status,
            formatDate(order.timestamp)
        ).includes(query))
        : currentRevenueOrders;

    if (!filteredOrders.length) {
        revenueBody.innerHTML = emptyRow(`Tidak ada transaksi yang cocok dengan "${query}".`, 5);
        return;
    }

    revenueBody.innerHTML = filteredOrders
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .map(revenueRow)
        .join("");
}

function revenueRow(order) {
    return `
        <tr class="transition hover:bg-slate-50">
            <td class="px-6 py-5">
                <p class="text-sm font-bold text-resqNavy">${escapeHtml(order.productName)}</p>
                <p class="mt-1 text-xs font-medium text-slate-500">${escapeHtml(order.restaurantId)}</p>
            </td>
            <td class="px-6 py-5 text-sm font-semibold text-slate-700">${escapeHtml(order.customerEmail)}</td>
            <td class="px-6 py-5 text-sm font-bold text-resqNavy">${formatRupiah(order.totalPrice)}</td>
            <td class="px-6 py-5 text-sm font-medium text-slate-700">${escapeHtml(order.paymentMethod)}</td>
            <td class="px-6 py-5 text-sm font-medium text-slate-700">${formatDate(order.timestamp)}</td>
        </tr>
    `;
}

function getSearchInput() {
    return document.querySelector('header input[type="search"]');
}

function getSearchQuery() {
    return normalizeSearch(getSearchInput()?.value || "");
}

function searchableText(...values) {
    return normalizeSearch(values.join(" "));
}

function normalizeSearch(value) {
    return String(value || "").trim().toLowerCase();
}
