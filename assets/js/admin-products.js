import { initAdminPage } from "./admin-shell.js";
import { emptyRow, filterDataForPartner, loadAdminData } from "./admin-data.js";
import { realtimeDb, ref, push, serverTimestamp, update } from "./firebase.js";
import { byId, escapeHtml, formatRupiah } from "./utils.js";

initAdminPage("products", loadProductsPage);
setupProductForm();
setupProductsSearch();

const defaultProductImage = "";
const maxImageFileSize = 750 * 1024;
const modalTransitionMs = 200;
let currentPartnerProfile = null;
let currentMenus = [];
let currentEditingProductId = null;
let closeModalTimer = null;

async function loadProductsPage(user, partnerProfile) {
    if (partnerProfile) currentPartnerProfile = partnerProfile;

    const subtitle = byId("products-subtitle");
    const productsBody = byId("products-body");

    try {
        const { menus } = filterDataForPartner(await loadAdminData(), currentPartnerProfile);
        currentMenus = menus;
        const totalStock = menus.reduce((sum, item) => sum + item.stock, 0);
        const availableMenus = menus.filter((item) => item.stock > 0);

        byId("product-total-menu").innerText = menus.length.toLocaleString("id-ID");
        byId("product-total-stock").innerText = totalStock.toLocaleString("id-ID");
        byId("product-available-menu").innerText = availableMenus.length.toLocaleString("id-ID");
        subtitle.innerText = "Kelola daftar menu surplus, harga, dan stok yang sedang tersedia.";

        if (!menus.length) {
            productsBody.innerHTML = emptyRow("Belum ada menu surplus di database.", 6);
            return;
        }

        renderProducts(getSearchQuery());
    } catch (error) {
        console.error("Admin products error:", error);
        subtitle.innerText = "Gagal memuat data menu dari Firebase.";
        productsBody.innerHTML = emptyRow("Gagal memuat data menu.", 6);
    }
}

function setupProductsSearch() {
    getSearchInput()?.addEventListener("input", () => renderProducts(getSearchQuery()));
}

function renderProducts(query = "") {
    const productsBody = byId("products-body");
    const filteredMenus = query
        ? currentMenus.filter((menu) => searchableText(
            menu.name,
            menu.restaurantId,
            menu.price,
            menu.stock,
            menu.imageUrl,
            menu.stock > 0 ? "tersedia" : "stok habis"
        ).includes(query))
        : currentMenus;

    if (!filteredMenus.length) {
        productsBody.innerHTML = emptyRow(`Tidak ada produk yang cocok dengan "${query}".`, 6);
        return;
    }

    productsBody.innerHTML = filteredMenus
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(productRow)
        .join("");

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function setupProductForm() {
    const modal = byId("product-modal");
    const modalPanel = byId("product-modal-panel");
    const form = byId("product-form");
    const openButton = byId("btn-open-product-modal");
    const closeButton = byId("btn-close-product-modal");
    const cancelButton = byId("btn-cancel-product");
    const productsBody = byId("products-body");
    const storeNameInput = byId("product-store");
    const imageUrlInput = byId("product-image-url");
    const imageFileInput = byId("product-image-file");

    openButton?.addEventListener("click", () => openModal());
    closeButton?.addEventListener("click", closeModal);
    cancelButton?.addEventListener("click", closeModal);
    productsBody?.addEventListener("click", (event) => {
        const editButton = event.target.closest("[data-edit-product]");
        if (!editButton) return;

        const product = currentMenus.find((menu) => menu.id === editButton.dataset.editProduct);
        if (product) openModal(product);
    });
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    form?.addEventListener("submit", submitProduct);
    imageUrlInput?.addEventListener("input", () => {
        const imageUrl = imageUrlInput.value.trim();
        byId("product-image-data").value = "";
        if (imageFileInput) imageFileInput.value = "";
        updateImagePreview(imageUrl || defaultProductImage);
    });
    imageFileInput?.addEventListener("change", previewImageFile);

    function openModal(product = null) {
        currentEditingProductId = product?.id || null;
        const storeName = getPartnerStoreName();
        setProductModalMode(Boolean(product));

        if (product) {
            fillProductForm(product);
        } else {
            form?.reset();
            updateImagePreview(defaultProductImage);
        }

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
        openProductModal(modal, modalPanel);
    }

    function closeModal() {
        closeProductModal(modal, modalPanel, () => {
            form?.reset();
            currentEditingProductId = null;
            setProductModalMode(false);
            updateImagePreview(defaultProductImage);
            setFormMessage("");
        });
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
    const imageUrl = String(formData.get("image_data") || formData.get("image_url") || "").trim();

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
        const menuPayload = {
            name,
            restaurant_id: getPartnerStoreName() || restaurantId,
            surplus_price: price,
            stock,
            description,
            image_url: imageUrl,
            partner_uid: getProductPartnerUid(),
            updated_at: serverTimestamp()
        };

        if (currentEditingProductId) {
            await update(ref(realtimeDb, `menus/${currentEditingProductId}`), menuPayload);
        } else {
            await push(ref(realtimeDb, "menus"), {
                ...menuPayload,
                partner_uid: currentPartnerProfile?.is_system_admin ? null : currentPartnerProfile?.id || null,
                created_at: serverTimestamp()
            });
        }

        closeProductModal(byId("product-modal"), byId("product-modal-panel"), () => {
            form.reset();
            currentEditingProductId = null;
            setProductModalMode(false);
            updateImagePreview(defaultProductImage);
        });
        byId("products-subtitle").innerText = currentEditingProductId
            ? "Data makanan berhasil diperbarui."
            : "Makanan baru berhasil ditambahkan.";
        await loadProductsPage();
    } catch (error) {
        console.error("Save product error:", error);
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
            : `<i data-lucide="save" class="h-4 w-4"></i>${currentEditingProductId ? "Simpan Perubahan" : "Simpan Makanan"}`;
    }
}

function setProductModalMode(isEdit) {
    byId("product-modal-title").innerText = isEdit ? "Edit Makanan" : "Tambah Makanan";
    byId("product-modal-description").innerText = isEdit
        ? "Ubah detail menu surplus yang sudah ada di daftar produk."
        : "Masukkan detail menu surplus yang akan ditampilkan di daftar produk.";

    const submitButton = byId("btn-submit-product");
    if (submitButton) {
        submitButton.innerHTML = `<i data-lucide="save" class="h-4 w-4"></i>${isEdit ? "Simpan Perubahan" : "Simpan Makanan"}`;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function fillProductForm(product) {
    byId("product-name").value = product.name || "";
    byId("product-store").value = product.restaurantId || "";
    byId("product-price").value = product.price || "";
    byId("product-stock").value = product.stock || 0;
    byId("product-description").value = product.description || "";
    byId("product-image-file").value = "";

    const imageUrlInput = byId("product-image-url");
    const imageDataInput = byId("product-image-data");
    if (String(product.imageUrl || "").startsWith("data:")) {
        imageUrlInput.value = "";
        imageDataInput.value = product.imageUrl;
    } else {
        imageUrlInput.value = product.imageUrl || "";
        imageDataInput.value = "";
    }

    updateImagePreview(product.imageUrl || defaultProductImage);
}

function getProductPartnerUid() {
    if (currentEditingProductId) {
        const product = currentMenus.find((menu) => menu.id === currentEditingProductId);
        return product?.partnerUid || null;
    }

    return currentPartnerProfile?.is_system_admin ? null : currentPartnerProfile?.id || null;
}

function openProductModal(modal, modalPanel) {
    if (!modal || !modalPanel) return;

    window.clearTimeout(closeModalTimer);
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
        modal.classList.remove("bg-slate-950/0", "opacity-0", "backdrop-blur-0");
        modal.classList.add("bg-slate-950/50", "opacity-100", "backdrop-blur-sm");
        modalPanel.classList.remove("translate-y-4", "scale-95", "opacity-0");
        modalPanel.classList.add("translate-y-0", "scale-100", "opacity-100");
        byId("product-name")?.focus();
    });
}

function closeProductModal(modal, modalPanel, onClosed) {
    if (!modal || !modalPanel || modal.classList.contains("hidden")) {
        onClosed?.();
        return;
    }

    window.clearTimeout(closeModalTimer);
    modal.setAttribute("aria-hidden", "true");
    modal.classList.add("bg-slate-950/0", "opacity-0", "backdrop-blur-0");
    modal.classList.remove("bg-slate-950/50", "opacity-100", "backdrop-blur-sm");
    modalPanel.classList.add("translate-y-4", "scale-95", "opacity-0");
    modalPanel.classList.remove("translate-y-0", "scale-100", "opacity-100");

    closeModalTimer = window.setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        onClosed?.();
    }, modalTransitionMs);
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

function previewImageFile(event) {
    const file = event.target.files?.[0];
    const imageUrlInput = byId("product-image-url");
    const imageDataInput = byId("product-image-data");

    if (!file) {
        imageDataInput.value = "";
        updateImagePreview(imageUrlInput?.value.trim() || defaultProductImage);
        return;
    }

    if (!file.type.startsWith("image/")) {
        event.target.value = "";
        imageDataInput.value = "";
        setFormMessage("File harus berupa gambar.");
        updateImagePreview(defaultProductImage);
        return;
    }

    if (file.size > maxImageFileSize) {
        event.target.value = "";
        imageDataInput.value = "";
        setFormMessage("Ukuran gambar maksimal 750 KB. Pakai link gambar untuk file yang lebih besar.");
        updateImagePreview(defaultProductImage);
        return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        const dataUrl = String(reader.result || "");
        imageDataInput.value = dataUrl;
        if (imageUrlInput) imageUrlInput.value = "";
        updateImagePreview(dataUrl);
        setFormMessage("");
    });
    reader.readAsDataURL(file);
}

function updateImagePreview(src) {
    const preview = byId("product-image-preview");
    const placeholder = byId("product-image-placeholder");
    if (!preview || !placeholder) return;

    const hasImage = Boolean(src);
    preview.src = hasImage ? src : "";
    preview.classList.toggle("hidden", !hasImage);
    placeholder.classList.toggle("hidden", hasImage);
}

function productRow(menu) {
    const isAvailable = menu.stock > 0;
    const imageUrl = menu.imageUrl || "";
    const thumbnail = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(menu.name)}" class="h-full w-full object-contain p-2" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
           <span class="hidden text-slate-400"><i data-lucide="image-plus" class="h-6 w-6"></i></span>`
        : `<span class="text-slate-400"><i data-lucide="image-plus" class="h-6 w-6"></i></span>`;

    return `
        <tr class="transition hover:bg-slate-50">
            <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                    <span class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100">${thumbnail}</span>
                    <span class="min-w-0">
                        <span class="block text-sm font-bold text-resqNavy">${escapeHtml(menu.name)}</span>
                        <span class="mt-1 block truncate text-xs font-medium text-slate-500">ID: ${escapeHtml(menu.id)}</span>
                    </span>
                </div>
            </td>
            <td class="px-6 py-5 text-sm font-semibold text-slate-700">${escapeHtml(menu.restaurantId)}</td>
            <td class="px-6 py-5 text-sm font-bold text-resqNavy">${formatRupiah(menu.price)}</td>
            <td class="px-6 py-5 text-sm font-semibold text-slate-700">${menu.stock.toLocaleString("id-ID")} porsi</td>
            <td class="px-6 py-5">
                <span class="inline-flex rounded-full ${isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} px-3 py-1 text-xs font-bold">
                    ${isAvailable ? "Tersedia" : "Stok Habis"}
                </span>
            </td>
            <td class="px-6 py-5">
                <button type="button" data-edit-product="${escapeHtml(menu.id)}" class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-resqBlue transition hover:bg-slate-50">
                    <i data-lucide="pencil" class="h-4 w-4"></i>
                    Edit
                </button>
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
