import { realtimeDb, ref, get } from "./firebase.js";

export async function loadAdminData() {
    const [menusSnapshot, ordersSnapshot] = await Promise.all([
        get(ref(realtimeDb, "menus")),
        get(ref(realtimeDb, "orders"))
    ]);

    const menus = snapshotToList(menusSnapshot).map((item) => ({
        id: item.id,
        name: item.name || "Menu tanpa nama",
        restaurantId: item.restaurant_id || "Toko belum diatur",
        price: Number(item.surplus_price) || 0,
        stock: Number(item.stock) || 0,
        partnerUid: item.partner_uid || null
    }));

    const orders = snapshotToList(ordersSnapshot).map((item) => ({
        id: item.id,
        customerEmail: item.customer_email || "customer@resq.com",
        productName: item.product_name || "Menu tidak diketahui",
        restaurantId: item.restaurant_id || "Toko belum diatur",
        totalPrice: Number(item.total_price) || 0,
        pickupCode: item.pickup_code || "-",
        paymentMethod: item.payment_method || "-",
        status: item.status || "Menunggu Pengambilan",
        timestamp: item.timestamp || null,
        partnerUid: item.partner_uid || null
    }));

    return { menus, orders };
}

export function filterDataForPartner(data, partnerProfile) {
    if (!partnerProfile || partnerProfile.is_system_admin) return data;

    const storeName = partnerProfile.store_name || partnerProfile.storeName || "";
    const belongsToPartner = (item) => {
        if (item.partnerUid && item.partnerUid === partnerProfile.id) return true;
        return storeName && item.restaurantId === storeName;
    };

    return {
        menus: data.menus.filter(belongsToPartner),
        orders: data.orders.filter(belongsToPartner)
    };
}

export function getPrimaryStoreName(menus, orders) {
    const counts = new Map();

    [...menus, ...orders].forEach((item) => {
        const name = item.restaurantId;
        if (!name || name === "Toko belum diatur") return;
        counts.set(name, (counts.get(name) || 0) + 1);
    });

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "Nama Toko";
}

export function getStatusStyle(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("selesai") || normalized.includes("picked")) {
        return { label: "Sudah Diambil", className: "bg-slate-200 text-slate-700", isWarning: false };
    }

    if (normalized.includes("batal") || normalized.includes("late") || normalized.includes("terlambat")) {
        return { label: status, className: "bg-red-100 text-red-700", isWarning: true };
    }

    return { label: status || "Menunggu Pengambilan", className: "bg-green-100 text-green-700", isWarning: false };
}

export function isPickedUp(status) {
    const normalized = String(status || "").toLowerCase();
    return normalized.includes("selesai") || normalized.includes("picked");
}

export function isWaitingPickup(status) {
    const normalized = String(status || "").toLowerCase();
    return normalized.includes("menunggu") || normalized.includes("pickup") || normalized.includes("pengambilan");
}

export function getInitials(value) {
    return String(value || "?")
        .split("@")[0]
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

export function getCustomerName(email) {
    return String(email || "Pelanggan")
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function formatDate(timestamp) {
    if (!timestamp) return "Waktu belum tercatat";

    const date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) return "Waktu belum tercatat";

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

export function emptyRow(message, colspan = 4) {
    return `<tr><td colspan="${colspan}" class="px-6 py-10 text-center text-sm font-semibold text-slate-500">${message}</td></tr>`;
}

function snapshotToList(snapshot) {
    const items = [];

    snapshot.forEach((childSnapshot) => {
        items.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
        });
    });

    return items;
}
