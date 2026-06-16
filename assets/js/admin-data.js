import { realtimeDb, ref, get } from "./firebase.js";

const LOCAL_MENUS_KEY = "resq_partner_uploaded_menus";
const LOCAL_ORDERS_KEY = "resq_user_orders";

export async function loadAdminData() {
    const [menusSnapshot, ordersSnapshot] = await Promise.all([
        safeGet("menus"),
        safeGet("orders")
    ]);

    const menus = mergeById(snapshotToList(menusSnapshot), readLocalList(LOCAL_MENUS_KEY)).map((item) => ({
        id: item.id,
        name: item.name || "Menu tanpa nama",
        restaurantId: item.restaurant_id || "Toko belum diatur",
        price: Number(item.surplus_price) || 0,
        stock: Number(item.stock) || 0,
        description: item.description || "",
        image: item.image_url || item.image || "",
        imageUrl: item.image_url || item.imageUrl || item.image || "",
        updatedAt: item.updated_at || item.created_at || item.firebase_created_at || null,
        category: item.category || item.kategori || "",
        expiredAt: item.expired_at || item.expiredAt || "",
        partnerUid: item.partner_uid || null
    }));

    const orders = mergeById(snapshotToList(ordersSnapshot), readLocalList(LOCAL_ORDERS_KEY)).map((item) => ({
        id: item.id,
        customerEmail: item.customer_email || "customer@resq.com",
        customerName: item.customer_name || null,
        productName: item.product_name || "Menu tidak diketahui",
        menuName: item.product_name || "Menu tidak diketahui",
        productId: item.product_id || null,
        restaurantId: item.restaurant_id || "Toko belum diatur",
        totalPrice: Number(item.total_price) || 0,
        total: Number(item.total_price) || 0,
        pickupCode: item.pickup_code || "-",
        pickupTime: item.pickup_time || item.pickup_code || "-",
        paymentMethod: item.payment_method || "-",
        status: item.status || "Menunggu Pengambilan",
        timestamp: item.timestamp || null,
        partnerUid: item.partner_uid || null
    }));

    return { menus, orders };
}

async function safeGet(path) {
    try {
        return await get(ref(realtimeDb, path));
    } catch (error) {
        console.warn(`Firebase read failed for ${path}; using local fallback.`, error);
        return null;
    }
}

export function filterDataForPartner(data, partnerProfile) {
    if (!partnerProfile || partnerProfile.is_system_admin) return data;

    const storeName = getPartnerDisplayName(partnerProfile);
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

export function getPartnerDisplayName(profile) {
    if (!profile) return "Mitra RESQ";
    return getEmailDisplayName(profile.email) || profile.store_name || profile.storeName || profile.owner_name || "Mitra RESQ";
}

export function getEmailDisplayName(email) {
    return String(email || "")
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
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
    if (!snapshot) return items;

    snapshot.forEach((childSnapshot) => {
        items.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
        });
    });

    return items;
}

function readLocalList(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
        console.error(`Local data read error for ${key}:`, error);
        return [];
    }
}

function mergeById(primary, secondary) {
    const items = new Map();
    [...secondary, ...primary].forEach((item) => {
        const id = item.id || item.local_id || `${item.name || item.product_name}-${item.created_at || item.timestamp || Math.random()}`;
        items.set(id, { ...item, id });
    });
    return [...items.values()];
}
