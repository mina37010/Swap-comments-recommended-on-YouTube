
(() => {
    "use strict";

    const STORAGE_KEY = "ytSwapState";
    const BUTTON_ID = "yt-swap-btn";
    const STYLE_ID = "yt-swap-style";

    // 二重起動を防止
    if (window.__ytSwapInstalled) return;
    window.__ytSwapInstalled = true;

    let swapped = localStorage.getItem(STORAGE_KEY) === "1";

    let currentRoot = null;
    let currentVideoId = null;
    let session = null;

    let watchObserver = null;
    let waitObserver = null;
    let scheduled = false;
    let navigating = false;

    const isWatchPage = () =>
        location.pathname === "/watch";

    const getVideoId = () =>
        new URLSearchParams(location.search).get("v");

    // CSS
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
            ytd-watch-flexy[data-yt-swap-active]
            #secondary-inner #comments {
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
            }

            ytd-watch-flexy[data-yt-swap-active]
            #below #related {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin-top: 16px;
            }
        `;

        document.head.appendChild(style);
    }

    // 元のDOM位置へ戻す
    function restorePanels() {
        if (!session) return;

        const {
            root,
            comments,
            related,
            commentsSlot,
            relatedSlot
        } = session;

        const below = root.querySelector("#below");
        const secondary = root.querySelector("#secondary-inner");

        if (comments.isConnected) {
            if (commentsSlot.isConnected) {
                commentsSlot.after(comments);
            } else if (below?.isConnected && !below.contains(comments)) {
                below.appendChild(comments);
            }
        }

        if (related.isConnected) {
            if (relatedSlot.isConnected) {
                relatedSlot.after(related);
            } else if (
                secondary?.isConnected &&
                !secondary.contains(related)
            ) {
                secondary.appendChild(related);
            }
        }

        commentsSlot.remove();
        relatedSlot.remove();

        root.removeAttribute("data-yt-swap-active");
        session = null;
    }

    // コメントとおすすめを交換
    function swapPanels(root) {
        // YouTubeによるDOM再生成を検出
        if (session) {
            const valid =
                session.root === root &&
                session.comments.isConnected &&
                session.related.isConnected &&
                session.commentsSlot.isConnected &&
                session.relatedSlot.isConnected;

            if (!valid) {
                restorePanels();
            }
        }

        // 初回だけ元の位置を記録
        if (!session) {
            const comments = root.querySelector(
                "#below ytd-comments#comments, #below #comments"
            );

            const related = root.querySelector(
                "#secondary-inner #related"
            );

            if (!comments || !related) return;

            const commentsSlot = document.createComment(
                "yt-swap-comments"
            );

            const relatedSlot = document.createComment(
                "yt-swap-related"
            );

            comments.before(commentsSlot);
            related.before(relatedSlot);

            session = {
                root,
                comments,
                related,
                commentsSlot,
                relatedSlot
            };
        }

        const {
            comments,
            related,
            commentsSlot,
            relatedSlot
        } = session;

        // 既に正しい位置なら移動しない
        if (related.previousSibling !== commentsSlot) {
            commentsSlot.after(related);
        }

        if (comments.previousSibling !== relatedSlot) {
            relatedSlot.after(comments);
        }

        root.setAttribute("data-yt-swap-active", "");
    }

    // ボタン表示状態
    function updateButton(root) {
        const btn = root.querySelector(
            `#${BUTTON_ID} button`
        );

        if (!btn) return;

        const label = swapped
            ? "コメントとおすすめを元に戻す"
            : "コメントとおすすめを入れ替える";

        btn.title = label;
        btn.setAttribute("aria-label", label);
        btn.setAttribute("aria-pressed", String(swapped));
    }

    // ボタン生成
    function ensureButton(root) {
        const menu = root.querySelector(
            "ytd-watch-metadata ytd-menu-renderer"
        );

        if (!menu) return;

        if (menu.querySelector(`#${BUTTON_ID}`)) return;

        const shape = document.createElement("yt-button-shape");
        shape.id = BUTTON_ID;
        shape.className = "ytd-menu-renderer";

        const btn = document.createElement("button");
        btn.type = "button";

        btn.className = [
            "yt-spec-button-shape-next",
            "yt-spec-button-shape-next--tonal",
            "yt-spec-button-shape-next--mono",
            "yt-spec-button-shape-next--size-m",
            "yt-spec-button-shape-next--icon-button"
        ].join(" ");

        btn.innerHTML = `
            <div class="yt-spec-button-shape-next__icon">
                <svg xmlns="http://www.w3.org/2000/svg"
                     viewBox="0 0 24 24"
                     width="24"
                     height="24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="2"
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     style="pointer-events:none">
                    <path d="M7 12H17M10 9L7 12L10 15
                             M14 9L17 12L14 15"/>
                </svg>
            </div>
        `;

        btn.addEventListener("click", () => {
            swapped = !swapped;

            localStorage.setItem(
                STORAGE_KEY,
                swapped ? "1" : "0"
            );

            reconcile();
        });

        shape.appendChild(btn);
        menu.appendChild(shape);

        updateButton(root);
    }

    // 監視コールバックをまとめる
    function scheduleReconcile() {
        if (scheduled) return;

        scheduled = true;

        setTimeout(() => {
            scheduled = false;
            reconcile();
        }, 100);
    }

    // 動画ページの監視を切り替える
    function setRoot(newRoot, videoId) {
        restorePanels();

        if (watchObserver) {
            watchObserver.disconnect();
            watchObserver = null;
        }

        if (waitObserver) {
            waitObserver.disconnect();
            waitObserver = null;
        }

        currentRoot = newRoot;
        currentVideoId = videoId;

        if (newRoot) {
            watchObserver = new MutationObserver(
                scheduleReconcile
            );

            watchObserver.observe(newRoot, {
                childList: true,
                subtree: true
            });
        } else if (isWatchPage()) {
            // 動画ページのDOMがまだ無い場合だけ待機
            waitObserver = new MutationObserver(
                scheduleReconcile
            );

            waitObserver.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    }

    // 状態を同期
    function reconcile() {
        if (navigating) return;

        const root = isWatchPage()
            ? document.querySelector("ytd-watch-flexy")
            : null;

        const videoId = isWatchPage()
            ? getVideoId()
            : null;

        // 動画が切り替わった場合、監視対象も更新
        if (
            root !== currentRoot ||
            videoId !== currentVideoId
        ) {
            setRoot(root, videoId);
        }

        if (!root) return;

        ensureStyle();
        ensureButton(root);

        if (swapped) {
            swapPanels(root);
        } else {
            restorePanels();
        }

        updateButton(root);
    }

    // YouTubeのSPA遷移に対応
    document.addEventListener("yt-navigate-start", () => {
        navigating = true;
        restorePanels();
    });

    document.addEventListener("yt-navigate-finish", () => {
        navigating = false;
        scheduleReconcile();
    });

    document.addEventListener(
        "yt-page-data-updated",
        scheduleReconcile
    );

    window.addEventListener("popstate", scheduleReconcile);
    window.addEventListener("pageshow", scheduleReconcile);

    // 初回起動
    if (document.documentElement) {
        reconcile();
    } else {
        document.addEventListener(
            "DOMContentLoaded",
            reconcile,
            { once: true }
        );
    }
})();
