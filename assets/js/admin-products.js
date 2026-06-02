import { initAdminPage } from "./admin-shell.js";
import { emptyRow, filterDataForPartner, loadAdminData } from "./admin-data.js";
import { realtimeDb, ref, push, serverTimestamp } from "./firebase.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

initAdminPage("products", loadProductsPage);
setupProductForm();

let currentPartnerProfile = null;

async function loadProductsPage(user, partnerProfile) {
    if (partnerProfile) currentPartnerProfile = partnerProfile;

    const subtitle = byId("products-subtitle");
    const productsBody = byId("products-body");

    try {
        const { menus } = filterDataForPartner(await loadAdminData(), currentPartnerProfile);
        const totalStock = menus.reduce((sum, item) => sum + item.stock, 0);
        const availableMenus = menus.filter((item) => item.stock > 0);

        byId("product-total-menu").innerText = menus.length.toLocaleString("id-ID");
        byId("product-total-stock").innerText = totalStock.toLocaleString("id-ID");
        byId("product-available-menu").innerText = availableMenus.length.toLocaleString("id-ID");
        subtitle.innerText = "Kelola daftar menu surplus, harga, dan stok yang sedang tersedia.";

        if (!menus.length) {
            productsBody.innerHTML = emptyRow("Belum ada menu surplus di database.", 5);
            return;
        }

        productsBody.innerHTML = menus
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(productRow)
            .join("");
    } catch (error) {
        console.error("Admin products error:", error);
        subtitle.innerText = "Gagal memuat data menu dari Firebase.";
        productsBody.innerHTML = emptyRow("Gagal memuat data menu.", 5);
    }
}

function setupProductForm() {
    const modal = byId("product-modal");
    const form = byId("product-form");
    const openButton = byId("btn-open-product-modal");
    const closeButton = byId("btn-close-product-modal");
    const cancelButton = byId("btn-cancel-product");
    const storeNameInput = byId("product-store");

    openButton?.addEventListener("click", openModal);
    closeButton?.addEventListener("click", closeModal);
    cancelButton?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    form?.addEventListener("submit", submitProduct);

    function openModal() {
        const storeName = getPartnerStoreName();
        if (storeName && storeNameInput) {
            storeNameInput.value = storeName;
            storeNameInput.readOnly = true;
            storeNameInput.classList.add("bg-slate-50");
        } else if (storeNameInput) {
            storeNameInput.readOnly = false;
            storeNameInput.classList.remove("bg-slate-50");
        }

        modal?.classList.remove("hidden");
        modal?.classList.add("flex");
        byId("product-name")?.focus();
    }

    function closeModal() {
        modal?.classList.add("hidden");
        modal?.classList.remove("flex");
        form?.reset();
        setFormMessage("");
    }
}

async function submitProduct(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = byId("btn-submit-product");
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const restaurantId = String(formData.get("restaurant_id") || "").trim();
    const price = Number(formData.get("surplus_price"));
    const stock = Number(formData.get("stock"));
    const description = String(formData.get("description") || "").trim();

    if (!name || !restaurantId || Number.isNaN(price) || Number.isNaN(stock)) {
        setFormMessage("Lengkapi nama makanan, nama toko, harga, dan stok.");
        return;
    }

    if (price < 0 || stock < 0) {
        setFormMessage("Harga dan stok tidak boleh kurang dari 0.");
        return;
    }

    setSubmitState(true);
    setFormMessage("");

    try {
        await push(ref(realtimeDb, "menus"), {
            name,
            restaurant_id: getPartnerStoreName() || restaurantId,
            surplus_price: price,
            stock,
            description,
            partner_uid: currentPartnerProfile?.is_system_admin ? null : currentPartnerProfile?.id || null,
            created_at: serverTimestamp()
        });

        form.reset();
        byId("product-modal")?.classList.add("hidden");
        byId("product-modal")?.classList.remove("flex");
        byId("products-subtitle").innerText = "Makanan baru berhasil ditambahkan.";
        await loadProductsPage();
    } catch (error) {
        console.error("Create product error:", error);
        setFormMessage("Gagal menyimpan makanan. Coba lagi atau cek akses Firebase.");
    } finally {
        setSubmitState(false);
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function setSubmitState(isLoading) {
        if (!submitButton) return;
        submitButton.disabled = isLoading;
        submitButton.classList.toggle("opacity-70", isLoading);
        submitButton.classList.toggle("cursor-not-allowed", isLoading);
        submitButton.innerHTML = isLoading
            ? `<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i>Menyimpan...`
            : `<i data-lucide="save" class="h-4 w-4"></i>Simpan Makanan`;
    }
}

function getPartnerStoreName() {
    if (!currentPartnerProfile || currentPartnerProfile.is_system_admin) return "";
    return currentPartnerProfile.store_name || currentPartnerProfile.storeName || "";
}

function setFormMessage(message) {
    const messageEl = byId("product-form-message");
    if (!messageEl) return;

    messageEl.innerText = message;
    messageEl.classList.toggle("hidden", !message);
}

function productRow(menu) {
    const isAvailable = menu.stock > 0;

    return `
        <tr class="transition hover:bg-slate-50">
            <td class="px-6 py-5">
                <p class="text-sm font-bold text-resqNavy">${escapeHtml(menu.name)}</p>
                <p class="mt-1 text-xs font-medium text-slate-500">ID: ${escapeHtml(menu.id)}</p>
            </td>
            <td class="px-6 py-5 text-sm font-semibold text-slate-700">${escapeHtml(menu.restaurantId)}</td>
            <td class="px-6 py-5 text-sm font-bold text-resqNavy">${formatRupiah(menu.price)}</td>
            <td class="px-6 py-5 text-sm font-semibold text-slate-700">${menu.stock.toLocaleString("id-ID")} porsi</td>
            <td class="px-6 py-5">
                <span class="inline-flex rounded-full ${isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} px-3 py-1 text-xs font-bold">
                    ${isAvailable ? "Tersedia" : "Stok Habis"}
                </span>
            </td>
        </tr>
    `;
}
