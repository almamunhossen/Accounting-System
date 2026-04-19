// API client for Google Apps Script backend
// Set your deployed Apps Script Web App URL here.
window.API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycby95Ut1SU6Aw-3PXnr_JH2Tz2-1CnGWP42T8JGE7qtf8pNicwfTIJxnqBZ9h8HGO1aYoA/exec";

try {
    const persistedApiUrl = localStorage.getItem("gs_api_url") || "";
    if (!window.API_URL && persistedApiUrl) {
        window.API_URL = persistedApiUrl;
    }
} catch (error) {
    console.warn("Unable to read persisted API URL:", error);
}

(function attachApiClient(global) {
    const warnedMissingActions = new Set();

    function isConfigured() {
        return typeof global.API_URL === "string" && /^https?:\/\//i.test(global.API_URL);
    }

    function getMissingActionName(message) {
        const text = String(message || "");
        const match = text.match(/Unknown action:\s*([A-Za-z0-9_]+)/i);
        return match ? match[1] : "";
    }

    function ensureUiHelpers() {
        if (!document.getElementById("globalLoadingOverlay")) {
            const overlay = document.createElement("div");
            overlay.id = "globalLoadingOverlay";
            overlay.className = "global-loading-overlay";
            overlay.innerHTML = [
                "<div class='global-loading-card' role='status' aria-live='polite' aria-label='Loading'>",
                "  <div class='global-loading-spinner' aria-hidden='true'>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "    <span class='global-loading-dot'></span>",
                "  </div>",
                "  <span class='global-loading-text'>LOADING.IO</span>",
                "</div>"
            ].join("");
            document.body.appendChild(overlay);
        }

        if (!document.getElementById("globalToast")) {
            const toast = document.createElement("div");
            toast.id = "globalToast";
            toast.style.cssText = "position:fixed;right:20px;bottom:20px;max-width:320px;padding:10px 14px;border-radius:10px;background:#1f2937;color:#fff;display:none;z-index:3100;box-shadow:0 10px 20px rgba(0,0,0,0.2);";
            document.body.appendChild(toast);
        }
    }

    function showLoading() {
        ensureUiHelpers();
        const el = document.getElementById("globalLoadingOverlay");
        if (el) el.style.display = "flex";
    }

    function hideLoading() {
        const el = document.getElementById("globalLoadingOverlay");
        if (el) el.style.display = "none";
    }

    function showToast(message, type) {
        ensureUiHelpers();
        const el = document.getElementById("globalToast");
        if (!el) return;
        const bg = type === "error" ? "#b91c1c" : type === "success" ? "#047857" : "#1f2937";
        el.style.background = bg;
        el.textContent = message;
        el.style.display = "block";
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            el.style.display = "none";
        }, 2400);
    }

    async function request(payload) {
        if (!isConfigured()) {
            return { success: false, message: "API_URL is not configured.", data: [] };
        }

        const res = await fetch(global.API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error("API request failed with status " + res.status);
        }

        const json = await res.json();
        if (!json || json.success === false) {
            throw new Error((json && json.message) || "API returned an error");
        }
        return json;
    }

    async function getData(action, params) {
        const payload = Object.assign({ action: action }, params || {});
        showLoading();
        try {
            const json = await request(payload);
            return Array.isArray(json.data) ? json.data : [];
        } catch (error) {
            const missingAction = getMissingActionName(error && error.message);
            if (missingAction && /^get/i.test(String(action || ""))) {
                // Keep UI working when a read endpoint is not deployed yet.
                if (!warnedMissingActions.has(missingAction)) {
                    warnedMissingActions.add(missingAction);
                    showToast(`${missingAction} is not deployed yet. Using cached/local data.`, "error");
                }
                return [];
            }
            showToast(error.message || "Failed to load data", "error");
            throw error;
        } finally {
            hideLoading();
        }
    }

    async function postData(action, data) {
        const payload = Object.assign({ action: action }, data || {});
        showLoading();
        try {
            const json = await request(payload);
            showToast("Saved successfully", "success");
            return json;
        } catch (error) {
            showToast(error.message || "Failed to save data", "error");
            throw error;
        } finally {
            hideLoading();
        }
    }

    global.APIClient = {
        isConfigured,
        getData,
        postData,
        showToast,
        showLoading,
        hideLoading,
        setApiUrl: function setApiUrl(url) {
            const nextUrl = String(url || "").trim();
            global.API_URL = nextUrl;
            try {
                if (nextUrl) {
                    localStorage.setItem("gs_api_url", nextUrl);
                } else {
                    localStorage.removeItem("gs_api_url");
                }
            } catch (error) {
                console.warn("Unable to persist API URL:", error);
            }
            return global.API_URL;
        }
    };
})(window);
