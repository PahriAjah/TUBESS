export function byId(id) {
    return document.getElementById(id);
}

export function show(el) {
    el?.classList.remove("hidden");
}

export function hide(el) {
    el?.classList.add("hidden");
}

export function setError(el, message) {
    if (!el) return;
    el.innerText = message;
    show(el);
}

export function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
