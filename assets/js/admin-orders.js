import { initAdminPage } from "./admin-shell.js";
import { emptyRow, filterDataForPartner, formatDate, getCustomerName, getStatusStyle, isPickedUp, loadAdminData } from "./admin-data.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

initAdminPage("orders", loadOrdersPage);
setupOrdersSearch();

let currentActiveOrders = [];

async function loadOrdersPage(user, partnerProfile) {
    const subtitle = byId("orders-subtitle");
    const ordersBody = byId("orders-body");
    const pickupPanel = byId("pickup-code-panel");
    const pickupTitle = byId("pickup-code-title");
    const pickupValue = byId("pickup-code-value");
    const pickupMeta = byId("pickup-code-meta");
    const pickupDescription = byId("pickup-code-description");

    try {
        const { orders } = filterDataForPartner(await loadAdminData(), partnerProfile);
        const activeOrders = orders
            .filter((order) => !isPickedUp(order.status))
            .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
        currentActiveOrders = activeOrders;
        const waitingOrders = activeOrders.filter((order) => String(order.status).toLowerCase().includes("menunggu"));

        byId("orders-active-count").innerText = activeOrders.length.toLocaleString("id-ID");
        byId("orders-waiting-count").innerText = waitingOrders.length.toLocaleString("id-ID");
        byId("orders-total-value").innerText = formatRupiah(activeOrders.reduce((sum, order) => sum + order.totalPrice, 0));
        subtitle.innerText = "Pantau semua pesanan yang belum selesai diambil pelanggan.";

        if (activeOrders.length) {
            const latestOrder = activeOrders[0];
            pickupPanel?.classList.remove("hidden");
            pickupTitle.innerText = latestOrder.pickupCode || "-";
            pickupValue.innerText = latestOrder.pickupCode || "-";
            pickupMeta.innerText = `${getCustomerName(latestOrder.customerEmail)} - ${formatDate(latestOrder.timestamp)}`;
            pickupDescription.innerText = "Kode pengambilan ini harus dicocokkan oleh pelanggan saat ambil pesanan di mitra bisnis. Kode hanya tampil ketika ada pesanan aktif.";
        } else {
            pickupPanel?.classList.add("hidden");
            pickupTitle.innerText = "-";
            pickupValue.innerText = "-";
            pickupMeta.innerText = "Belum ada pesanan aktif.";
            pickupDescription.innerText = "Kode ini muncul saat ada pesanan aktif. Minta pelanggan menyebutkan kode ini saat mengambil pesanan di mitra bisnis.";
        }

        if (!activeOrders.length) {
            ordersBody.innerHTML = emptyRow("Tidak ada pesanan aktif saat ini.", 6);
            return;
        }

        renderOrders(getSearchQuery());
    } catch (error) {
        console.error("Admin orders error:", error);
        subtitle.innerText = "Gagal memuat pesanan aktif dari Firebase.";
        ordersBody.innerHTML = emptyRow("Gagal memuat data pesanan.", 6);
    }
}

function setupOrdersSearch() {
    getSearchInput()?.addEventListener("input", () => renderOrders(getSearchQuery()));
}

function renderOrders(query = "") {
    const ordersBody = byId("orders-body");
    const filteredOrders = query
        ? currentActiveOrders.filter((order) => searchableText(
            order.customerEmail,
            getCustomerName(order.customerEmail),
            order.productName,
            order.restaurantId,
            order.totalPrice,
            order.pickupCode,
            order.status,
            formatDate(order.timestamp)
        ).includes(query))
        : currentActiveOrders;

    if (!filteredOrders.length) {
        ordersBody.innerHTML = emptyRow(`Tidak ada pesanan yang cocok dengan "${query}".`, 6);
        return;
    }

    ordersBody.innerHTML = filteredOrders.map(orderRow).join("");
}

function orderRow(order) {
    const status = getStatusStyle(order.status);

    return `
        <tr class="transition hover:bg-slate-50">
            <td class="px-6 py-5">
                <p class="text-sm font-bold text-resqNavy">${escapeHtml(getCustomerName(order.customerEmail))}</p>
                <p class="mt-1 text-xs font-medium text-slate-500">${escapeHtml(order.customerEmail)}</p>
            </td>
            <td class="px-6 py-5">
                <p class="text-sm font-bold text-resqNavy">${escapeHtml(order.productName)}</p>
                <p class="mt-1 text-xs font-medium text-slate-500">${escapeHtml(order.restaurantId)}</p>
            </td>
            <td class="px-6 py-5 text-sm font-bold text-resqNavy">${formatRupiah(order.totalPrice)}</td>
            <td class="px-6 py-5 text-sm font-semibold text-slate-700">${escapeHtml(order.pickupCode)}</td>
            <td class="px-6 py-5 text-sm font-medium text-slate-700">${formatDate(order.timestamp)}</td>
            <td class="px-6 py-5">
                <span class="inline-flex rounded-full ${status.className} px-3 py-1 text-xs font-bold">${escapeHtml(status.label)}</span>
            </td>
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
