window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('screen-0');
        splash.style.opacity = '0';

        setTimeout(() => {
            splash.classList.add('hidden-screen');
            document.getElementById('screen-1').classList.remove('hidden-screen');
            document.getElementById('skip-container').classList.remove('hidden-screen');
        }, 700);
    }, 1800);
});

document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.addEventListener("click", () => {
        goToScreen(Number(button.dataset.screenTarget));
    });
});

function goToScreen(screenNumber) {
    if (screenNumber === 2) {
        document.getElementById('screen-1').classList.add('hidden-screen');
        document.getElementById('screen-2').classList.remove('hidden-screen');
    }
}
