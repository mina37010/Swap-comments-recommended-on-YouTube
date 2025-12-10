(function () {
    'use strict';

    const waitForEl = (selector, cb) => {
        const timer = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(timer);
                cb(el);
            }
        }, 300);
    };

    const createSwapButton = (menuRenderer) => {
        if (document.getElementById("yt-swap-btn")) return;

        const shape = document.createElement("yt-button-shape");
        shape.id = "yt-swap-btn";
        shape.classList.add("ytd-menu-renderer");

        const btn = document.createElement("button");
        btn.className = `
            yt-spec-button-shape-next
            yt-spec-button-shape-next--tonal
            yt-spec-button-shape-next--mono
            yt-spec-button-shape-next--size-m
            yt-spec-button-shape-next--icon-button
            yt-spec-button-shape-next--enable-backdrop-filter-experiment
        `.replace(/\s+/g, ' ').trim();

        const iconWrap = document.createElement("div");
        iconWrap.className = "yt-spec-button-shape-next__icon";
        iconWrap.innerHTML = `
            <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
                <span class="yt-icon-shape ytSpecIconShapeHost">
                    <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                        <svg xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24" width="24" height="24"
                            style="pointer-events:none">
                            <path d="M7 12H17M10 9L7 12L10 15
                                    M14 9L17 12L14 15"
                                stroke="currentColor"
                                stroke-width="2"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"/>
                        </svg>
                    </div>
                </span>
            </span>
        `;

        const touch = document.createElement("yt-touch-feedback-shape");
        touch.className = "yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response";
        touch.innerHTML = `
            <div class="yt-spec-touch-feedback-shape__stroke"></div>
            <div class="yt-spec-touch-feedback-shape__fill"></div>
        `;

        btn.appendChild(iconWrap);
        btn.appendChild(touch);
        shape.appendChild(btn);
        menuRenderer.appendChild(shape);

        // swap logic
        let swapped = localStorage.getItem("ytSwapState") === "1";

        const movePanels = () => {
            const comments = document.querySelector("#comments");
            const secondaryInner = document.querySelector("#secondary-inner");
            const primary = document.querySelector("#below");

            if (!comments || !secondaryInner || !primary) return;

            let secondaryPack = document.querySelector("#yt-secondary-pack");

            if (!secondaryPack) {
                secondaryPack = document.createElement("div");
                secondaryPack.id = "yt-secondary-pack";

                while (secondaryInner.firstChild) {
                    secondaryPack.appendChild(secondaryInner.firstChild);
                }

                secondaryInner.appendChild(secondaryPack);
            }

            if (swapped) {
                primary.appendChild(secondaryPack);
                secondaryInner.appendChild(comments);
            } else {
                primary.appendChild(comments);
                secondaryInner.appendChild(secondaryPack);
            }
        };

        btn.addEventListener("click", () => {
            swapped = !swapped;
            localStorage.setItem("ytSwapState", swapped ? "1" : "0");
            movePanels();
        });

        movePanels();
    };

    const observeButtonArea = () => {
        waitForEl("ytd-watch-metadata", (metadata) => {
            const observer = new MutationObserver(() => {
                const menuRenderer = metadata.querySelector("ytd-menu-renderer");
                if (menuRenderer && !document.getElementById("yt-swap-btn")) {
                    createSwapButton(menuRenderer);
                }
            });

            observer.observe(metadata, {
                childList: true,
                subtree: true,
            });

            const menuRenderer = metadata.querySelector("ytd-menu-renderer");
            if (menuRenderer) {
                createSwapButton(menuRenderer);
            }
        });
    };

    document.addEventListener("yt-navigate-finish", () => {
        setTimeout(() => {
            observeButtonArea();
        }, 200);
    });
})();
