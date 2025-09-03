 document.addEventListener("DOMContentLoaded", function() {
            const allowedPages = ["entering_page.html", "home.html", "not_found.html", "art.html", "poems.html", "https://pookiebear-town.neocities.org/kedahouse"];
            const iframe = document.getElementById("content-frame");

            function isValidPage(url) {
                const page = url.split('/').pop();
                return allowedPages.includes(page);
            }

            function updateIframeSrc() {
                const currentSrc = iframe.src;
                if (!isValidPage(new URL(currentSrc, window.location.href).pathname)) {
                    iframe.src = "not_found.html"; // Redireciona para uma página padrão se a URL não for permitida
                }
            }

            iframe.addEventListener("load", updateIframeSrc);
            updateIframeSrc(); // Verifica a URL inicial do iframe
        });