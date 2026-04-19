// API client for Google Apps Script backend
// Set your deployed Apps Script Web App URL here.
window.API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbx7Y97A400SK9ZcL_lMp8N-9sVDtpahOJxULb1OjXvaoSViM--ojR_hGnGL9dbX6EYkIQ/exec";

try {
    const persistedApiUrl = localStorage.getItem("gs_api_url") || "";
    if (persistedApiUrl) {
        window.API_URL = persistedApiUrl;
    }
} catch (error) {
    console.warn("Unable to read persisted API URL:", error);
}

(function attachApiClient(global) {
    const warnedMissingActions = new Set();
    const API_UNAVAILABLE_UNTIL_KEY = "gs_api_unavailable_until";
    const API_UNAVAILABLE_WINDOW_MS = 5 * 60 * 1000;

    function normalizeApiUrl(url) {
        return String(url || "").trim().replace(/\s+/g, "");
    }

    function getApiUnavailableUntil() {
        try {
            const raw = sessionStorage.getItem(API_UNAVAILABLE_UNTIL_KEY);
            return Number(raw || 0);
        } catch (error) {
            return 0;
        }
    }

    function markApiUnavailable() {
        const until = Date.now() + API_UNAVAILABLE_WINDOW_MS;
        try {
            sessionStorage.setItem(API_UNAVAILABLE_UNTIL_KEY, String(until));
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function clearApiUnavailable() {
        try {
            sessionStorage.removeItem(API_UNAVAILABLE_UNTIL_KEY);
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function isApiTemporarilyUnavailable() {
        const until = getApiUnavailableUntil();
        return until > Date.now();
    }

    function getFriendlyNetworkMessage(error) {
        const message = String((error && error.message) || error || "");
        if ((error && error.name) === "AbortError") {
            return "API request timed out. Please check internet and Apps Script deployment status.";
        }
        if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
            return "Failed to reach API. Check API URL, internet, and Apps Script Web App access (Execute as Me, Who has access: Anyone).";
        }
        return message || "Network request failed";
    }

    function isConfigured() {
        const url = normalizeApiUrl(global.API_URL);
        global.API_URL = url;
        if (!/^https?:\/\//i.test(url)) return false;
        if (isApiTemporarilyUnavailable()) return false;
        return true;
    }

    function getMissingActionName(message) {
        const text = String(message || "");
        const match = text.match(/Unknown action:\s*([A-Za-z0-9_]+)/i);
        return match ? match[1] : "";
    }

    function ensureUiHelpers() {
        if (!document.getElementById("globalToast")) {
            const toast = document.createElement("div");
            toast.id = "globalToast";
            toast.style.cssText = "position:fixed;right:20px;bottom:20px;max-width:320px;padding:10px 14px;border-radius:10px;background:#1f2937;color:#fff;display:none;z-index:3100;box-shadow:0 10px 20px rgba(0,0,0,0.2);";
            document.body.appendChild(toast);
        }
    }

    function showLoading() {
        // Loading overlay disabled by request.
    }

    function hideLoading() {
        // Loading overlay disabled by request.
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
            const tempDown = isApiTemporarilyUnavailable();
            throw new Error(
                tempDown
                    ? "API temporarily unavailable. Using local cached mode."
                    : "API_URL is not configured."
            );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        let res;

        try {
            res = await fetch(global.API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                    "Accept": "application/json, text/plain, */*"
                },
                body: JSON.stringify(payload),
                redirect: "follow",
                signal: controller.signal
            });
        } catch (error) {
            markApiUnavailable();
            throw new Error(getFriendlyNetworkMessage(error));
        } finally {
            clearTimeout(timeoutId);
        }

        const responseText = await res.text();

        if (!res.ok) {
            markApiUnavailable();
            throw new Error("API request failed with status " + res.status);
        }

        let json;
        try {
            json = JSON.parse(responseText);
        } catch (error) {
            if (/<!doctype html|<html/i.test(responseText)) {
                markApiUnavailable();
                throw new Error("API returned HTML instead of JSON. Redeploy Apps Script Web App and set access to Anyone.");
            }
            markApiUnavailable();
            throw new Error("API returned invalid JSON response.");
        }

        if (!json || json.success === false) {
            throw new Error((json && json.message) || "API returned an error");
        }
        clearApiUnavailable();
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

    async function postDataSilent(action, data) {
        const payload = Object.assign({ action: action }, data || {});
        return await request(payload);
    }

    global.APIClient = {
        isConfigured,
        getData,
        postData,
        postDataSilent,
        showToast,
        showLoading,
        hideLoading,
        setApiUrl: function setApiUrl(url) {
            const nextUrl = normalizeApiUrl(url);
            global.API_URL = nextUrl;
            clearApiUnavailable();
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
