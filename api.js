// API client for Google Apps Script backend
// Set your deployed Apps Script Web App URL here.
window.API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbx7Y97A400SK9ZcL_lMp8N-9sVDtpahOJxULb1OjXvaoSViM--ojR_hGnGL9dbX6EYkIQ/exec";

try {
    const persistedApiUrl = sessionStorage.getItem("gs_api_url") || "";
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
    const API_WRITE_QUEUE_LIMIT = 500;
    let isFlushingQueue = false;
    let writeQueueMemory = [];

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
        if (/CORS|cross-origin|Access-Control-Allow-Origin/i.test(message)) {
            return "Browser blocked API request by CORS policy. Redeploy Apps Script Web App with Execute as Me and Who has access: Anyone, or use the built-in JSONP fallback.";
        }
        if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
            return "Failed to reach API. Check API URL, internet, and Apps Script Web App access (Execute as Me, Who has access: Anyone). If hosted on GitHub Pages, CORS fallback will be attempted automatically.";
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

    function isRetriableWriteError(error) {
        const message = String((error && error.message) || error || "");
        return /Failed to reach API|Network request failed|timed out|temporarily unavailable|API_URL is not configured|returned HTML instead of JSON|invalid JSON|status 429|status 5\d\d/i.test(message);
    }

    function loadWriteQueue() {
        return Array.isArray(writeQueueMemory) ? writeQueueMemory.slice() : [];
    }

    function saveWriteQueue(queue) {
        writeQueueMemory = Array.isArray(queue) ? queue.slice() : [];
    }

    function getWriteQueueCount() {
        return loadWriteQueue().length;
    }

    function enqueueWrite(action, data, errorMessage) {
        const queue = loadWriteQueue();
        const item = {
            id: "q-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
            action: String(action || "").trim(),
            data: data || {},
            created_at: new Date().toISOString(),
            error: String(errorMessage || "")
        };
        queue.push(item);
        if (queue.length > API_WRITE_QUEUE_LIMIT) {
            queue.splice(0, queue.length - API_WRITE_QUEUE_LIMIT);
        }
        saveWriteQueue(queue);
        return item;
    }

    async function flushWriteQueue(options) {
        const opts = Object.assign({ silent: false }, options || {});
        if (isFlushingQueue) {
            return { synced: 0, remaining: getWriteQueueCount() };
        }
        if (!isConfigured()) {
            return { synced: 0, remaining: getWriteQueueCount() };
        }

        const queue = loadWriteQueue();
        if (!queue.length) {
            return { synced: 0, remaining: 0 };
        }

        let synced = 0;
        isFlushingQueue = true;
        try {
            while (queue.length) {
                const item = queue[0];
                const payload = Object.assign({ action: item.action }, item.data || {});
                try {
                    await request(payload);
                    queue.shift();
                    saveWriteQueue(queue);
                    synced += 1;
                } catch (error) {
                    if (!isRetriableWriteError(error)) {
                        // Drop permanently invalid queued writes so queue can continue.
                        queue.shift();
                        saveWriteQueue(queue);
                        continue;
                    }
                    break;
                }
            }
        } finally {
            isFlushingQueue = false;
        }

        if (synced > 0 && !opts.silent) {
            showToast(`Synced ${synced} offline change(s) to Google Sheets.`, "success");
        }

        return { synced: synced, remaining: queue.length };
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

    function isLikelyCorsFetchError(error) {
        const message = String((error && error.message) || error || "");
        return /Failed to fetch|NetworkError|Load failed|CORS|cross-origin|Access-Control-Allow-Origin/i.test(message);
    }

    function requestViaJsonp(payload) {
        const baseUrl = normalizeApiUrl(global.API_URL);
        if (!/^https:\/\/script\.google\.com\/macros\/s\//i.test(baseUrl)) {
            return Promise.reject(new Error("JSONP fallback supports Google Apps Script /exec URL only."));
        }

        const serializedPayload = JSON.stringify(payload || {});
        if (serializedPayload.length > 7000) {
            return Promise.reject(new Error("Request payload is too large for CORS fallback transport."));
        }

        return new Promise((resolve, reject) => {
            const callbackName = "__gs_jsonp_cb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
            const script = document.createElement("script");
            let settled = false;

            function cleanup() {
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                try {
                    delete global[callbackName];
                } catch (error) {
                    global[callbackName] = undefined;
                }
            }

            const timeoutId = setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error("CORS fallback request timed out."));
            }, 20000);

            global[callbackName] = function handleJsonpResponse(response) {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                cleanup();
                if (!response || response.success === false) {
                    reject(new Error((response && response.message) || "API returned an error"));
                    return;
                }
                resolve(response);
            };

            script.async = true;
            script.onerror = function handleJsonpError() {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                cleanup();
                reject(new Error("Failed to load API fallback transport."));
            };

            const separator = baseUrl.includes("?") ? "&" : "?";
            script.src = `${baseUrl}${separator}payload=${encodeURIComponent(serializedPayload)}&callback=${encodeURIComponent(callbackName)}&_ts=${Date.now()}`;
            document.head.appendChild(script);
        });
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
            if (isLikelyCorsFetchError(error)) {
                try {
                    const fallbackJson = await requestViaJsonp(payload);
                    clearApiUnavailable();
                    return fallbackJson;
                } catch (fallbackError) {
                    markApiUnavailable();
                    throw new Error(getFriendlyNetworkMessage(fallbackError));
                }
            }
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
            if (getWriteQueueCount() > 0) {
                flushWriteQueue({ silent: true }).catch(() => {
                    // Ignore background sync errors.
                });
            }
            return json;
        } catch (error) {
            if (isRetriableWriteError(error)) {
                enqueueWrite(action, data, error && error.message);
                showToast("API offline. Change saved locally and queued for sync.", "success");
                return {
                    success: true,
                    queued: true,
                    message: "Saved locally. Will sync when API is online.",
                    data: data || {}
                };
            }
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

    if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("online", function handleOnlineSync() {
            flushWriteQueue({ silent: false }).catch(() => {
                // Ignore background sync errors.
            });
        });

        setInterval(() => {
            if (getWriteQueueCount() > 0) {
                flushWriteQueue({ silent: true }).catch(() => {
                    // Ignore background sync errors.
                });
            }
        }, 30000);
    }

    global.APIClient = {
        isConfigured,
        getData,
        postData,
        postDataSilent,
        flushQueuedWrites: function flushQueuedWrites() {
            return flushWriteQueue({ silent: false });
        },
        getQueuedWritesCount: getWriteQueueCount,
        showToast,
        showLoading,
        hideLoading,
        setApiUrl: function setApiUrl(url) {
            const nextUrl = normalizeApiUrl(url);
            global.API_URL = nextUrl;
            clearApiUnavailable();
            try {
                if (nextUrl) {
                    sessionStorage.setItem("gs_api_url", nextUrl);
                } else {
                    sessionStorage.removeItem("gs_api_url");
                }
            } catch (error) {
                console.warn("Unable to persist API URL:", error);
            }
            if (nextUrl) {
                flushWriteQueue({ silent: true }).catch(() => {
                    // Ignore background sync errors.
                });
            }
            return global.API_URL;
        }
    };
})(window);

