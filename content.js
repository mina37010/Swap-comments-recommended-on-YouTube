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

    waitForEl("ytd-menu-renderer", (menuRenderer) => {

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


        // === ICON ⇒ arrows ===
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


        const container = menuRenderer.querySelector("ytd-menu-renderer")
            || menuRenderer;
        container.appendChild(shape);


        const tooltip = document.createElement("div");
        tooltip.className = "yt-swap-tooltip";
        tooltip.textContent = "コメント ↔︎ レコメンド";
        document.body.appendChild(tooltip);



        btn.addEventListener("mouseenter", () => {
            const rect = btn.getBoundingClientRect();

            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.bottom + 6 + window.scrollY}px`;

            tooltip.style.transform = "translateX(-50%) translateY(-2px)";
            tooltip.classList.add("visible");
        });

        btn.addEventListener("mousemove", () => {
            const rect = btn.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
        });

        btn.addEventListener("mouseleave", () => {
            tooltip.classList.remove("visible");
        });


        //
        // === SWAP LOGIC ===
        //
        let swapped = localStorage.getItem("ytSwapState") === "1";

        const movePanels = () => {
            const comments = document.querySelector("ytd-comments");
            const related = document.querySelector("#related");
            const primary = document.querySelector("#below");
            const secondary = document.querySelector("#secondary");

            if (!comments || !related || !primary || !secondary) return;

            if (swapped) {
                secondary.insertBefore(comments, secondary.firstChild);
                primary.appendChild(related);
            } else {
                secondary.insertBefore(related, secondary.firstChild);
                primary.appendChild(comments);
            }
        };

        waitForEl("#secondary", movePanels);

        btn.addEventListener("click", () => {
            swapped = !swapped;
            localStorage.setItem("ytSwapState", swapped ? "1" : "0");
            movePanels();
        });
    });

})();
