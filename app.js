  // ==================== DATA STORAGE ====================
        function toggleLoginPassword(btn) {
            const input = btn.closest('.login-field').querySelector('.login-input');
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        }

        let customers = [];
        let suppliers = [];
        let invoices = [];
        let quotations = [];
        let savedProducts = [];
        let expenses = [];
        let hrEmployees = [];
        let hrAttendance = [];
        let hrLeaves = [];
        let hrTasks = [];
        let currentCurrency = 'SAR';
        let nextInvoiceNumber = 2001;
        let nextQuotationNumber = 2001;
        let currentUser = { name: 'Admin', role: 'admin' };
        let currentCustomerId = null;
        let currentSupplierId = null;
        let currentProductId = null;
        let currentAttendanceId = null;
        let currentLeaveId = null;
        let currentSupplierHistoryId = null;
        let currentSupplierReportId = null;
        let currentSupplierPaymentEntryId = null;
        let currentEmployeePhoto = '';
        let pendingCompanyLogoData = '';
        let latestReportStats = null;
        const reportCharts = {};
        let supplierPurchaseHistory = {};

        const currencySymbols = { SAR: 'SR', BDT: '৳', USD: '$' };
        const exchangeRates = { SAR: 1, BDT: 27.5, USD: 0.27 };
        const saudiRiyalSymbolPath = 'image/Saudi_Riyal_Symbol.svg';
        const ADMIN_LOGIN_USERNAME = 'amhsumon';
        const ADMIN_LOGIN_PASSWORD = '@mHs#3030';
        const AUTH_SESSION_KEY = 'pro_invoice_admin_auth';
        const REMOVED_PRODUCT_IDS = new Set([
            '1776260800498-gb5fz1',
            '1776260800498-wd8as6',
            '1776260800499-5qdadh'
        ]);
        let appInitialized = false;

        function filterRemovedProducts(products) {
            return (products || []).filter(product => !REMOVED_PRODUCT_IDS.has(String(product?.id || '')));
        }

        function setAuthGateState(isAuthenticated) {
            const loginModal = document.getElementById('adminLoginModal');
            const appRoot = document.getElementById('appRoot');
            if (loginModal) loginModal.style.display = isAuthenticated ? 'none' : 'flex';
            if (appRoot) appRoot.style.display = isAuthenticated ? 'flex' : 'none';
        }

        function isAdminAuthenticated() {
            return sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
        }

        async function initializeAppAfterLogin() {
            if (appInitialized) return;
            loadSupplierPurchaseHistory();
            await loadData();
            applySidebarBranding();
            if (!isApiEnabled()) loadSavedProducts();
            setCurrentDate();
            generateInvoiceNumber();
            renderCustomerSelect();
            if (typeof renderHREmployeeOptions === 'function') renderHREmployeeOptions();
            updateDashboard();
            initCharts();
            appInitialized = true;
        }

        async function loginAdmin() {
            const usernameInput = document.getElementById('adminUsernameInput');
            const passwordInput = document.getElementById('adminPasswordInput');
            const errorEl = document.getElementById('adminLoginError');
            if (!usernameInput || !passwordInput) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            let authenticated = false;
            let authenticatedName = 'Admin';

            if (isApiEnabled()) {
                try {
                    const authRows = await window.APIClient.getData('verifyAdmin', { username, password });
                    const authRecord = Array.isArray(authRows) ? authRows[0] : null;
                    if (authRecord && authRecord.authenticated) {
                        authenticated = true;
                        authenticatedName = authRecord.name || username || 'Admin';
                    }
                } catch (error) {
                    console.error('Admin verification via API failed, using local fallback.', error);
                }
            }

            if (!authenticated && username === ADMIN_LOGIN_USERNAME && password === ADMIN_LOGIN_PASSWORD) {
                authenticated = true;
            }

            if (!authenticated) {
                if (errorEl) errorEl.textContent = 'Invalid username or password.';
                passwordInput.value = '';
                passwordInput.focus();
                return;
            }

            sessionStorage.setItem(AUTH_SESSION_KEY, '1');
            currentUser = { name: authenticatedName, role: 'admin' };
            const sidebarName = document.getElementById('sidebarUsername');
            if (sidebarName) sidebarName.textContent = currentUser.name;
            if (errorEl) errorEl.textContent = '';

            await initializeAppAfterLogin();
            setAuthGateState(true);
        }

        function getNextSupplierNumericId() {
            const baseStart = 2000;
            const maxUsed = suppliers.reduce((max, supplier) => {
                const match = String(supplier?.id || '').match(/^SUP-(\d+)$/i);
                if (!match) return max;
                const parsed = parseInt(match[1], 10);
                return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
            }, baseStart);
            return maxUsed + 1;
        }

        function generateSupplierCode() {
            return `SUP-${getNextSupplierNumericId()}`;
        }

        function getNextCustomerNumericId() {
            const baseStart = 2000;
            const maxUsed = customers.reduce((max, customer) => {
                const match = String(customer?.id || '').match(/^CUST-(\d+)$/i);
                if (!match) return max;
                const parsed = parseInt(match[1], 10);
                return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
            }, baseStart);
            return maxUsed + 1;
        }

        function generateCustomerCode() {
            return `CUST-${getNextCustomerNumericId()}`;
        }

        function getNextProductNumericId() {
            const baseStart = 2000;
            const maxUsed = savedProducts.reduce((max, product) => {
                const match = String(product?.id || '').match(/^PROD-(\d+)$/i);
                if (!match) return max;
                const parsed = parseInt(match[1], 10);
                return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
            }, baseStart);
            return maxUsed + 1;
        }

        function generateProductCode() {
            return `PROD-${getNextProductNumericId()}`;
        }

        function generateSupplierPaymentVoucherCode() {
            return `PV-${Date.now().toString().slice(-6)}`;
        }

        function formatDisplayDate(value) {
            if (!value) return '-';
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
        }

        function isApiEnabled() {
            return !!(window.APIClient && window.APIClient.isConfigured && window.APIClient.isConfigured());
        }

        function normalizeCustomerFromApi(row) {
            return {
                id: String(row.id || Date.now().toString()),
                name: row.name || '',
                phone: row.phone || '',
                email: row.email || '',
                company: row.company || '',
                vatNumber: row.vat || row.vatNumber || '',
                address: row.address || '',
                tag: row.tag || 'New',
                creditLimit: Number(row.credit_limit || row.creditLimit || 0),
                paymentTerms: Number(row.payment_terms || row.paymentTerms || 30),
                customerType: row.customer_type || row.customerType || 'Individual',
                status: row.status || 'Active',
                notes: row.notes || '',
                openingBalance: Number(row.opening_balance || row.openingBalance || 0),
                openingBalanceType: row.opening_balance_type || row.openingBalanceType || 'Dr',
                closingBalance: Number(row.closing_balance || row.closingBalance || 0),
                closingBalanceType: row.closing_balance_type || row.closingBalanceType || 'Dr',
                totalSpent: Number(row.total_purchase || row.totalSpent || 0),
                totalPaid: Number(row.total_paid || row.totalPaid || 0),
                dueAmount: Number(row.due || row.due_amount || row.dueAmount || 0),
                lastPaymentDate: row.last_payment_date || row.lastPaymentDate || '',
                lastContact: row.last_contact || row.lastContact || '',
                contactHistory: []
            };
        }

        function normalizeCustomerToApi(customer) {
            return {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                company: customer.company,
                vat: customer.vatNumber || '',
                address: customer.address,
                tag: customer.tag,
                credit_limit: Number(customer.creditLimit || 0),
                payment_terms: Number(customer.paymentTerms || 30),
                customer_type: customer.customerType || 'Individual',
                status: customer.status || 'Active',
                total_purchase: Number(customer.totalSpent || 0),
                total_paid: Number(customer.totalPaid || 0),
                due_amount: Number(customer.dueAmount || 0),
                due: Number(customer.dueAmount || 0),
                last_payment_date: customer.lastPaymentDate || '',
                last_contact: customer.lastContact || '',
                notes: customer.notes || '',
                opening_balance: Number(customer.openingBalance || 0),
                opening_balance_type: customer.openingBalanceType || 'Dr',
                closing_balance: Number(customer.closingBalance || 0),
                closing_balance_type: customer.closingBalanceType || 'Dr'
            };
        }

        function normalizeProductFromApi(row) {
            return {
                id: String(row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
                name: row.name || '',
                description: row.description || '',
                price: Number(row.price || 0),
                tax: Number(row.vat != null ? row.vat : (row.tax || 0)),
                supplierId: row.supplier_id || row.supplierId || '',
                supplierName: row.supplier_name || row.supplierName || '',
                cost: Number(row.cost || 0),
                vatIncluded: String(row.vat_included || row.vatIncluded || '').toLowerCase() === 'true',
                dontUpdateQty: String(row.dont_update_qty || row.dontUpdateQty || '').toLowerCase() === 'true'
            };
        }

        function normalizeExpenseFromApi(row) {
            return {
                id: String(row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
                date: row.date || row.expense_date || '',
                category: row.category || 'General',
                description: row.description || row.title || '',
                amount: Number(row.amount || row.total || 0)
            };
        }

        function normalizeSupplierFromApi(row) {
            return {
                id: String(row.id || Date.now().toString()),
                name: row.name || '',
                phone: row.phone || '',
                email: row.email || '',
                company: row.company || '',
                vatNumber: row.vat || row.vatNumber || '',
                address: row.address || '',
                paymentTerms: Number(row.payment_terms || row.paymentTerms || 30),
                contactPerson: row.contact_person || row.contactPerson || '',
                bankDetails: row.bank_details || row.bankDetails || '',
                status: row.status || 'Active',
                notes: row.notes || '',
                totalPurchase: Number(row.total_purchase || row.totalPurchase || 0),
                totalPaid: Number(row.total_paid || row.totalPaid || 0),
                dueAmount: Number(row.due || row.due_amount || row.dueAmount || 0),
                lastPurchaseDate: row.last_purchase_date || row.lastPurchaseDate || '',
                openingBalance: Number(row.opening_balance || row.openingBalance || 0),
                openingBalanceType: row.opening_balance_type || row.openingBalanceType || 'Dr',
                closingBalance: Number(row.closing_balance || row.closingBalance || 0),
                closingBalanceType: row.closing_balance_type || row.closingBalanceType || 'Dr'
            };
        }

        function normalizeSupplierToApi(supplier) {
            return {
                id: supplier.id,
                name: supplier.name,
                phone: supplier.phone,
                email: supplier.email,
                company: supplier.company,
                vat: supplier.vatNumber || '',
                address: supplier.address,
                payment_terms: Number(supplier.paymentTerms || 30),
                contact_person: supplier.contactPerson || '',
                bank_details: supplier.bankDetails || '',
                status: supplier.status || 'Active',
                total_purchase: Number(supplier.totalPurchase || 0),
                total_paid: Number(supplier.totalPaid || 0),
                due: Number(supplier.dueAmount || 0),
                last_purchase_date: supplier.lastPurchaseDate || '',
                notes: supplier.notes || '',
                opening_balance: Number(supplier.openingBalance || 0),
                opening_balance_type: supplier.openingBalanceType || 'Dr',
                closing_balance: Number(supplier.closingBalance || 0),
                closing_balance_type: supplier.closingBalanceType || 'Dr'
            };
        }

        function formatBalanceLabel(amount, type) {
            const parsed = Number(amount || 0);
            return `${formatCurrency(convertCurrency(parsed))} ${type || 'Dr'}`;
        }

        function normalizeSupplierPurchaseEntry(entry = {}, supplierId = '') {
            const total = Number(entry.total || ((Number(entry.quantity || 0) || 0) * (Number(entry.unitCost || 0) || 0)) || 0);
            const paidAmount = Math.max(0, Number(entry.paidAmount || 0));
            const dueAmount = Math.max(0, Number(entry.dueAmount != null ? entry.dueAmount : (total - paidAmount)));
            return {
                id: String(entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
                supplierId: String(entry.supplierId || supplierId || ''),
                invoiceNo: String(entry.invoiceNo || entry.billNo || `PB-${Date.now().toString().slice(-6)}`),
                date: entry.date || '',
                productName: entry.productName || 'Purchase',
                quantity: Number(entry.quantity || 0),
                unitCost: Number(entry.unitCost || 0),
                total,
                paidAmount,
                dueAmount,
                status: entry.status || (dueAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid')),
                note: entry.note || '',
                paymentHistory: Array.isArray(entry.paymentHistory) ? entry.paymentHistory : []
            };
        }

        function normalizeAllSupplierPurchaseHistory() {
            const normalized = {};
            Object.entries(supplierPurchaseHistory || {}).forEach(([supplierId, entries]) => {
                normalized[supplierId] = (Array.isArray(entries) ? entries : []).map(entry => normalizeSupplierPurchaseEntry(entry, supplierId));
            });
            supplierPurchaseHistory = normalized;
            saveSupplierPurchaseHistory();
        }

        function loadSupplierPurchaseHistory() {
            try {
                supplierPurchaseHistory = JSON.parse(localStorage.getItem('supplier_purchase_history') || '{}') || {};
                normalizeAllSupplierPurchaseHistory();
            } catch (error) {
                supplierPurchaseHistory = {};
            }
        }

        function saveSupplierPurchaseHistory() {
            localStorage.setItem('supplier_purchase_history', JSON.stringify(supplierPurchaseHistory));
        }

        function getSupplierPurchaseHistory(supplierId) {
            const history = supplierPurchaseHistory[String(supplierId || '')];
            return Array.isArray(history) ? history : [];
        }

        function getOutstandingSupplierPurchaseEntries(supplierId) {
            return getSupplierPurchaseHistory(supplierId).filter(entry => Number(entry.dueAmount || 0) > 0);
        }

        function updateSupplierPurchaseHistoryEntry(supplierId, entryId, updater) {
            const key = String(supplierId || '');
            const currentHistory = getSupplierPurchaseHistory(key);
            supplierPurchaseHistory[key] = currentHistory.map(entry => {
                if (String(entry.id) !== String(entryId)) return entry;
                const updatedEntry = typeof updater === 'function' ? updater(entry) : updater;
                return normalizeSupplierPurchaseEntry(updatedEntry, key);
            });
            saveSupplierPurchaseHistory();
        }

        function addSupplierPurchaseHistoryEntry(supplierId, entry) {
            const key = String(supplierId || '');
            const currentHistory = getSupplierPurchaseHistory(key);
            supplierPurchaseHistory[key] = [entry, ...currentHistory];
            saveSupplierPurchaseHistory();
        }

        function removeSupplierPurchaseHistory(supplierId) {
            delete supplierPurchaseHistory[String(supplierId || '')];
            saveSupplierPurchaseHistory();
        }

        function formatPurchaseQuantity(value) {
            const quantity = Number(value || 0);
            if (!Number.isFinite(quantity)) return '0';
            return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
        }

        function renderSupplierPurchaseHistoryMarkup(supplierId, limit = 3, emptyText = 'No purchases recorded yet.') {
            const rows = getSupplierPurchaseHistory(supplierId).slice(0, limit);
            if (!rows.length) {
                return `<p style="margin:8px 0 0;color:#64748b;font-size:13px;">${escapeHtml(emptyText)}</p>`;
            }

            return rows.map(entry => `
                <div style="padding:8px 0;border-top:1px dashed var(--border-color);font-size:13px;">
                    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
                        <div>
                            <strong style="color:var(--text-primary);">${escapeHtml(entry.productName || 'Purchase')}</strong>
                            <div style="margin-top:2px;color:#64748b;font-size:12px;">Invoice: ${escapeHtml(entry.invoiceNo || '-')} | <span style="font-weight:600;">${escapeHtml(entry.status || 'Unpaid')}</span></div>
                        </div>
                        <span style="white-space:nowrap;color:#1d4ed8;font-weight:600;">${formatCurrency(convertCurrency(Number(entry.total || 0)))}</span>
                    </div>
                    <div style="margin-top:2px;color:#64748b;">Qty: ${escapeHtml(formatPurchaseQuantity(entry.quantity))} | Unit: ${formatCurrency(convertCurrency(Number(entry.unitCost || 0)))}</div>
                    <div style="margin-top:2px;color:#64748b;">Paid: ${formatCurrency(convertCurrency(Number(entry.paidAmount || 0)))} | Due: ${formatCurrency(convertCurrency(Number(entry.dueAmount || 0)))}</div>
                    <div style="margin-top:2px;color:#64748b;">${escapeHtml(entry.date || '-')}</div>
                    ${entry.note ? `<div style="margin-top:2px;color:#475569;">${escapeHtml(entry.note)}</div>` : ''}
                </div>
            `).join('');
        }

        function getSupplierProductPurchaseTotal(supplierId) {
            return savedProducts
                .filter(product => String(product.supplierId || '') === String(supplierId || ''))
                .reduce((sum, product) => sum + Number(product.cost || 0), 0);
        }

        function getSupplierFinancials(supplier) {
            const productPurchaseTotal = getSupplierProductPurchaseTotal(supplier?.id);
            const storedTotalPurchase = Number(supplier?.totalPurchase || 0);
            const manualPurchaseAdjustment = Math.max(storedTotalPurchase - productPurchaseTotal, 0);
            const totalPurchase = productPurchaseTotal + manualPurchaseAdjustment;
            const totalPaid = Number(supplier?.totalPaid || 0);
            const dueAmount = Math.max(totalPurchase - totalPaid, 0);

            return {
                productPurchaseTotal,
                manualPurchaseAdjustment,
                totalPurchase,
                totalPaid,
                dueAmount
            };
        }

        function getSupplierReportStats(supplierId) {
            const supplier = suppliers.find(item => String(item.id) === String(supplierId));
            if (!supplier) return null;

            const entries = getSupplierPurchaseHistory(supplierId);
            const financials = getSupplierFinancials(supplier);
            const paymentVoucherCount = entries.reduce((count, entry) => count + (Array.isArray(entry.paymentHistory) ? entry.paymentHistory.length : 0), 0);
            const openInvoiceCount = entries.filter(entry => Number(entry.dueAmount || 0) > 0).length;

            return {
                supplier,
                entries,
                financials,
                paymentVoucherCount,
                openInvoiceCount
            };
        }

        function renderSupplierReportRows(entries) {
            if (!entries.length) {
                return '<tr><td colspan="8" class="supplier-report-empty">No supplier transactions found.</td></tr>';
            }

            return entries.map(entry => {
                const paymentCount = Array.isArray(entry.paymentHistory) ? entry.paymentHistory.length : 0;
                const statusClass = `supplier-report-status--${String(entry.status || 'unpaid').toLowerCase()}`;
                return `
                    <tr>
                        <td>${escapeHtml(formatDisplayDate(entry.date || '-'))}</td>
                        <td>${escapeHtml(entry.invoiceNo || '-')}</td>
                        <td>${escapeHtml(entry.productName || '-')}</td>
                        <td>${escapeHtml(formatPurchaseQuantity(entry.quantity))}</td>
                        <td>${formatCurrency(convertCurrency(Number(entry.total || 0)))}</td>
                        <td>${formatCurrency(convertCurrency(Number(entry.paidAmount || 0)))}</td>
                        <td>${formatCurrency(convertCurrency(Number(entry.dueAmount || 0)))}</td>
                        <td>
                            <span class="supplier-report-status ${statusClass}">${escapeHtml(entry.status || 'Unpaid')}</span>
                            <div class="supplier-report-subtext">${paymentCount} voucher${paymentCount === 1 ? '' : 's'}</div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function buildSupplierReportSummaryMarkup(report) {
            return `
                <div class="supplier-report-card">
                    <span>Total Purchases</span>
                    <strong>${formatCurrency(convertCurrency(Number(report.financials.totalPurchase || 0)))}</strong>
                </div>
                <div class="supplier-report-card">
                    <span>Total Paid</span>
                    <strong>${formatCurrency(convertCurrency(Number(report.financials.totalPaid || 0)))}</strong>
                </div>
                <div class="supplier-report-card">
                    <span>Total Due</span>
                    <strong>${formatCurrency(convertCurrency(Number(report.financials.dueAmount || 0)))}</strong>
                </div>
                <div class="supplier-report-card">
                    <span>Invoices</span>
                    <strong>${report.entries.length}</strong>
                    <small>${report.openInvoiceCount} open</small>
                </div>
                <div class="supplier-report-card">
                    <span>Payment Vouchers</span>
                    <strong>${report.paymentVoucherCount}</strong>
                </div>
            `;
        }

        function viewSupplierReport(id) {
            const report = getSupplierReportStats(id);
            if (!report) return;

            currentSupplierReportId = String(id);
            document.getElementById('supplierReportTitle').textContent = report.supplier.name || 'Supplier Report';
            document.getElementById('supplierReportMeta').textContent = `${escapeHtml(report.supplier.company || 'No company')} | ${escapeHtml(report.supplier.phone || 'No phone')}`;
            document.getElementById('supplierReportSummary').innerHTML = buildSupplierReportSummaryMarkup(report);
            document.getElementById('supplierReportTableBody').innerHTML = renderSupplierReportRows(report.entries);
            document.getElementById('supplierReportModal').style.display = 'flex';
        }

        function closeSupplierReportModal() {
            document.getElementById('supplierReportModal').style.display = 'none';
            currentSupplierReportId = null;
        }

        function printSupplierReport() {
            if (!currentSupplierReportId) return;
            const report = getSupplierReportStats(currentSupplierReportId);
            if (!report) return;

            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const companyName = settings.companyName || 'Company';
            const reportWindow = window.open('', '_blank', 'width=1100,height=860');
            if (!reportWindow) return;

            reportWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Supplier Report - ${escapeHtml(report.supplier.name)}</title>
<style>
body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
.sheet { max-width: 1080px; margin: 0 auto; }
.head { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; margin-bottom:24px; }
.head h1 { margin:0; font-size:28px; }
.head p { margin:6px 0 0; color:#475569; }
.summary { display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:12px; margin-bottom:20px; }
.card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; }
.card span { display:block; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
.card strong { display:block; margin-top:8px; font-size:22px; }
.card small { display:block; margin-top:4px; color:#64748b; }
table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; }
th, td { padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:left; }
th { background:#eef2f7; font-size:12px; text-transform:uppercase; letter-spacing:.05em; }
.status { display:inline-block; padding:5px 10px; border-radius:999px; font-size:11px; font-weight:700; }
.status.paid { background:rgba(22,163,74,.12); color:#166534; }
.status.partial { background:rgba(245,158,11,.16); color:#92400e; }
.status.unpaid { background:rgba(220,38,38,.12); color:#b91c1c; }
.subtext { display:block; margin-top:4px; font-size:11px; color:#64748b; }
@media print { body { background:#fff; padding:0; } .card, table { box-shadow:none; } }
</style></head><body>
<div class="sheet">
    <div class="head">
        <div>
            <h1>Supplier Report</h1>
            <p><strong>${escapeHtml(report.supplier.name || '-')}</strong></p>
            <p>${escapeHtml(report.supplier.company || '-')} | ${escapeHtml(report.supplier.phone || '-')}</p>
        </div>
        <div style="text-align:right;">
            <p style="margin:0;font-weight:700;">${escapeHtml(companyName)}</p>
            <p style="margin:6px 0 0;color:#64748b;">Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
    <div class="summary">
        ${buildSupplierReportSummaryMarkup(report)}
    </div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${report.entries.length ? report.entries.map(entry => {
                const paymentCount = Array.isArray(entry.paymentHistory) ? entry.paymentHistory.length : 0;
                const status = String(entry.status || 'Unpaid');
                const statusClass = status.toLowerCase();
                return `
                    <tr>
                        <td>${escapeHtml(formatDisplayDate(entry.date || '-'))}</td>
                        <td>${escapeHtml(entry.invoiceNo || '-')}</td>
                        <td>${escapeHtml(entry.productName || '-')}</td>
                        <td>${escapeHtml(formatPurchaseQuantity(entry.quantity))}</td>
                        <td>${formatCurrency(convertCurrency(Number(entry.total || 0)))}</td>
                        <td>${formatCurrency(convertCurrency(Number(entry.paidAmount || 0)))}</td>
                        <td>${formatCurrency(convertCurrency(Number(entry.dueAmount || 0)))}</td>
                        <td><span class="status ${statusClass}">${escapeHtml(status)}</span><span class="subtext">${paymentCount} voucher${paymentCount === 1 ? '' : 's'}</span></td>
                    </tr>
                `;
            }).join('') : '<tr><td colspan="8" style="text-align:center;color:#64748b;">No supplier transactions found.</td></tr>'}
        </tbody>
    </table>
</div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
            reportWindow.document.close();
        }

        function printSupplierPaymentVoucher(voucher) {
            if (!voucher) return;

            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const companyName = settings.companyName || 'Company';
            const voucherWindow = window.open('', '_blank', 'width=860,height=780');
            if (!voucherWindow) return;

            voucherWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payment Voucher - ${escapeHtml(voucher.voucherNo)}</title>
<style>
body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
.voucher { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
.head { background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%); color: #fff; padding: 22px 24px; display:flex; justify-content:space-between; gap:20px; }
.head h1 { margin:0; font-size:26px; }
.head p { margin:6px 0 0; opacity:.9; }
.body { padding: 22px 24px; }
.grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 18px; margin-bottom: 18px; }
.field { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
.field span { display:block; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
.field strong { display:block; margin-top:6px; font-size:15px; }
.amount-box { margin: 20px 0; padding: 18px 20px; border-radius: 16px; background: #eff6ff; border:1px solid #bfdbfe; text-align:center; }
.amount-box span { display:block; color:#1d4ed8; font-size:13px; text-transform:uppercase; letter-spacing:.06em; }
.amount-box strong { display:block; margin-top:8px; font-size:34px; color:#1e3a8a; }
.note-box { margin-top: 16px; padding: 14px 16px; border:1px dashed #cbd5e1; border-radius: 12px; color:#475569; min-height: 56px; }
.foot { display:flex; justify-content:space-between; gap:20px; margin-top: 26px; padding-top: 18px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b; }
@media print { body { background:#fff; padding:0; } .voucher { border:none; } }
</style></head><body>
<div class="voucher">
    <div class="head">
        <div>
            <h1>Payment Voucher</h1>
            <p>${escapeHtml(companyName)}</p>
        </div>
        <div style="text-align:right;">
            <p style="margin:0;font-weight:700;">Voucher No</p>
            <p style="margin:6px 0 0;font-size:20px;">${escapeHtml(voucher.voucherNo)}</p>
        </div>
    </div>
    <div class="body">
        <div class="grid">
            <div class="field"><span>Supplier</span><strong>${escapeHtml(voucher.supplierName || '-')}</strong></div>
            <div class="field"><span>Payment Date</span><strong>${escapeHtml(formatDisplayDate(voucher.paymentDate || '-'))}</strong></div>
            <div class="field"><span>Company</span><strong>${escapeHtml(voucher.supplierCompany || '-')}</strong></div>
            <div class="field"><span>Phone</span><strong>${escapeHtml(voucher.supplierPhone || '-')}</strong></div>
            <div class="field"><span>Invoice No</span><strong>${escapeHtml(voucher.invoiceNo || '-')}</strong></div>
            <div class="field"><span>Product</span><strong>${escapeHtml(voucher.productName || '-')}</strong></div>
            <div class="field"><span>Invoice Total</span><strong>${formatCurrency(convertCurrency(Number(voucher.invoiceTotal || 0)))}</strong></div>
            <div class="field"><span>Previous Due</span><strong>${formatCurrency(convertCurrency(Number(voucher.previousDue || 0)))}</strong></div>
            <div class="field"><span>Previous Paid</span><strong>${formatCurrency(convertCurrency(Number(voucher.previousPaid || 0)))}</strong></div>
            <div class="field"><span>Remaining Due</span><strong>${formatCurrency(convertCurrency(Number(voucher.remainingDue || 0)))}</strong></div>
        </div>
        <div class="amount-box">
            <span>Paid Amount</span>
            <strong>${formatCurrency(convertCurrency(Number(voucher.paidAmount || 0)))}</strong>
        </div>
        <div class="note-box">${escapeHtml(voucher.note || 'No note provided.')}</div>
        <div class="foot">
            <span>Payment recorded on ${new Date().toLocaleString()}</span>
            <span>Authorized Signature: ____________________</span>
        </div>
    </div>
</div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
            voucherWindow.document.close();
        }

        async function syncCustomersFromApi() {
            const rows = await window.APIClient.getData('getCustomers');
            customers = rows.map(normalizeCustomerFromApi);
        }

        async function syncProductsFromApi() {
            try {
                const rows = await window.APIClient.getData('getProducts');
                const normalizedProducts = rows.map(normalizeProductFromApi);
                const productsToDelete = normalizedProducts.filter(product => REMOVED_PRODUCT_IDS.has(String(product.id || '')));
                if (productsToDelete.length) {
                    await Promise.allSettled(productsToDelete.map(product => window.APIClient.postData('deleteProduct', { id: product.id })));
                }
                savedProducts = filterRemovedProducts(normalizedProducts);
            } catch (error) {
                const message = String(error?.message || '');
                if (/Unknown action:\s*getProducts/i.test(message)) {
                    // Allow Supplier/Customer modules to continue when product endpoint is not deployed yet.
                    savedProducts = [];
                    if (window.APIClient?.showToast) {
                        window.APIClient.showToast('Products API not deployed yet. Supplier data is still available.', 'error');
                    }
                    return;
                }
                throw error;
            }
        }

        async function syncExpensesFromApi() {
            const rows = await window.APIClient.getData('getExpenses');
            expenses = rows.map(normalizeExpenseFromApi);
        }

        async function syncQuotationsFromApi() {
            try {
                const rows = await window.APIClient.getData('getQuotations');
                quotations = rows.map(row => ({
                    id: String(row.id || Date.now().toString()),
                    quotationNo: row.quotation_no || row.quotationNo || '',
                    customerId: row.customer_id || row.customerId || '',
                    customerName: row.customer_name || row.customerName || '',
                    date: row.date || '',
                    subtotal: Number(row.subtotal || 0),
                    total: Number(row.total || 0),
                    discount: Number(row.discount || 0),
                    vatRate: Number(row.vat || row.vatRate || 0),
                    status: row.status || 'Uninvoiced',
                    items: (function parseItems(raw) {
                        if (typeof raw !== 'string') return raw || [];
                        if (!raw) return [];
                        try { return JSON.parse(raw); } catch (error) { return []; }
                    })(row.items)
                }));

                const maxUsed = quotations.reduce((max, quotation) => {
                    const match = String(quotation.quotationNo || '').match(/^QTN-(\d+)$/i);
                    if (!match) return max;
                    const parsed = parseInt(match[1], 10);
                    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
                }, 2000);
                nextQuotationNumber = maxUsed + 1;
            } catch (error) {
                const message = String(error?.message || '');
                if (/Unknown action:\s*getQuotations/i.test(message)) {
                    // Keep app usable when quotations endpoint is not deployed yet.
                    quotations = [];
                    if (window.APIClient?.showToast) {
                        window.APIClient.showToast('Quotations API not deployed yet. Dashboard and HR are still available.', 'error');
                    }
                    return;
                }
                throw error;
            }
        }

        async function syncSettingsFromApi() {
            const rows = await window.APIClient.getData('getSettings');
            if (!Array.isArray(rows) || rows.length === 0) return;

            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            rows.forEach(row => {
                const key = String(row.key || '').trim();
                if (!key) return;
                const rawValue = row.value;
                if (typeof rawValue === 'string') {
                    try {
                        settings[key] = JSON.parse(rawValue);
                    } catch (error) {
                        settings[key] = rawValue;
                    }
                } else {
                    settings[key] = rawValue;
                }
            });
            localStorage.setItem('pro_invoice_settings', JSON.stringify(settings));
        }

        async function saveSettingsToApi(settings) {
            if (!isApiEnabled()) return;
            const payload = {};
            Object.entries(settings || {}).forEach(([key, value]) => {
                payload[key] = typeof value === 'string' ? value : JSON.stringify(value);
            });
            await window.APIClient.postData('upsertSettings', { settings: payload });
        }

        async function syncSuppliersFromApi() {
            const rows = await window.APIClient.getData('getSuppliers');
            suppliers = rows.map(normalizeSupplierFromApi);
        }

        async function syncInvoicesFromApi() {
            const rows = await window.APIClient.getData('getInvoices');
            invoices = rows.map(row => ({
                id: String(row.id || Date.now().toString()),
                invoiceNo: row.invoice_no || row.invoiceNo || '',
                customerId: row.customer_id || row.customerId || '',
                customerName: row.customer_name || row.customerName || (customers.find(c => String(c.id) === String(row.customer_id || row.customerId || ''))?.name || ''),
                customerPhone: row.customer_phone || row.customerPhone || '',
                customerEmail: row.customer_email || row.customerEmail || '',
                customerCompany: row.customer_company || row.customerCompany || '',
                customerVatNumber: row.customer_vat || row.customerVatNumber || '',
                customerAddress: row.customer_address || row.customerAddress || '',
                date: row.date || '',
                dueDate: row.due_date || row.dueDate || '',
                items: (function parseItems(raw) {
                    if (typeof raw !== 'string') return raw || [];
                    if (!raw) return [];
                    try { return JSON.parse(raw); } catch (error) { return []; }
                })(row.items),
                subtotal: Number(row.subtotal || 0),
                discount: Number(row.discount || 0),
                vatRate: Number(row.vat || row.vatRate || 0),
                shipping: Number(row.shipping || 0),
                advancePayment: Number(row.advance_payment || row.advancePayment || 0),
                total: Number(row.total || 0),
                amountDue: Number(row.amount_due || row.amountDue || row.total || 0),
                status: row.status || 'Unpaid',
                currency: row.currency || 'SAR'
            }));
        }

        async function syncSupplierPurchasesFromApi() {
            const rows = await window.APIClient.getData('getSupplierPurchases');
            const rebuilt = {};
            rows.forEach(row => {
                const supplierId = String(row.supplier_id || '');
                if (!supplierId) return;
                if (!rebuilt[supplierId]) rebuilt[supplierId] = [];
                rebuilt[supplierId].push(normalizeSupplierPurchaseEntry({
                    id: String(row.id || ''),
                    supplierId,
                    invoiceNo: row.invoice_no || '',
                    date: row.purchase_date || row.date || '',
                    productName: row.product_name || '',
                    quantity: Number(row.quantity || 0),
                    unitCost: Number(row.unit_price || 0),
                    total: Number(row.total || 0),
                    paidAmount: Number(row.paid_amount || 0),
                    dueAmount: Number(row.due_amount || 0),
                    status: row.status || 'Unpaid',
                    note: row.notes || ''
                }, supplierId));
            });
            supplierPurchaseHistory = rebuilt;
            saveSupplierPurchaseHistory();
        }

        async function syncHRFromApi() {
            const [employees, attendance, leaves, tasks] = await Promise.all([
                window.APIClient.getData('getEmployees'),
                window.APIClient.getData('getAttendance'),
                window.APIClient.getData('getLeaves'),
                window.APIClient.getData('getTasks')
            ]);

            hrEmployees = employees.map(row => ({
                id: String(row.id || Date.now().toString()),
                name: row.name || '',
                role: row.role || '',
                department: row.department || '',
                salary: Number(row.salary || 0),
                email: row.email || '',
                mobile: row.mobile || '',
                homeAddress: row.home_address || row.homeAddress || '',
                website: row.website || '',
                profilePhoto: row.profile_photo || row.profilePhoto || ''
            }));

            hrAttendance = attendance.map(row => ({
                id: String(row.id || Date.now().toString()),
                employeeId: String(row.employee_id || row.employeeId || ''),
                date: row.date || '',
                status: row.status || 'Present'
            }));

            hrLeaves = leaves.map(row => ({
                id: String(row.id || Date.now().toString()),
                employeeId: String(row.employee_id || row.employeeId || ''),
                type: row.type || 'Annual',
                fromDate: row.from_date || row.fromDate || '',
                toDate: row.to_date || row.toDate || '',
                status: row.status || 'Pending'
            }));

            hrTasks = tasks.map(row => ({
                id: String(row.id || Date.now().toString()),
                title: row.title || '',
                priority: row.priority || 'Medium',
                done: (row.status || '').toLowerCase() === 'completed'
            }));
        }

        // ==================== INITIALIZATION ====================
        document.addEventListener('DOMContentLoaded', async () => {
            setAuthGateState(false);
            applySidebarBranding();
            const sidebarName = document.getElementById('sidebarUsername');
            if (sidebarName) sidebarName.textContent = currentUser.name;

            if (isAdminAuthenticated()) {
                await initializeAppAfterLogin();
                setAuthGateState(true);
                return;
            }

            const usernameInput = document.getElementById('adminUsernameInput');
            if (usernameInput) usernameInput.focus();
        });

        async function loadData() {
            const stored = localStorage.getItem('pro_invoice_data');
            if (stored) {
                const data = JSON.parse(stored);
                customers = data.customers || [];
                suppliers = data.suppliers || [];
                invoices = data.invoices || [];
                quotations = data.quotations || [];
                expenses = data.expenses || [];
                hrEmployees = data.hrEmployees || [];
                hrAttendance = data.hrAttendance || [];
                hrLeaves = data.hrLeaves || [];
                hrTasks = data.hrTasks || [];
                nextInvoiceNumber = data.nextInvoiceNumber || 2001;
                nextQuotationNumber = data.nextQuotationNumber || 2001;
            }

            if (isApiEnabled()) {
                const startupSyncs = [
                    { name: 'Customers', run: syncCustomersFromApi },
                    { name: 'Settings', run: syncSettingsFromApi },
                    { name: 'Suppliers', run: syncSuppliersFromApi },
                    { name: 'Products', run: syncProductsFromApi },
                    { name: 'Invoices', run: syncInvoicesFromApi },
                    { name: 'Quotations', run: syncQuotationsFromApi },
                    { name: 'HR', run: syncHRFromApi },
                    { name: 'Expenses', run: syncExpensesFromApi },
                    { name: 'SupplierPurchases', run: syncSupplierPurchasesFromApi }
                ];

                const results = await Promise.allSettled(startupSyncs.map(item => item.run()));
                const failedSyncs = results
                    .map((result, index) => ({ result, name: startupSyncs[index].name }))
                    .filter(item => item.result.status === 'rejected')
                    .map(item => item.name);

                if (failedSyncs.length) {
                    console.error('API partially available. Failed syncs:', failedSyncs);
                    if (window.APIClient?.showToast) {
                        window.APIClient.showToast(`API partially available (${failedSyncs.join(', ')}). Using cached data for missing modules.`, 'error');
                    }
                }

                updateSupplierOptions();
                saveData();
                return;
            }

            saveData();
        }

        function applySidebarBranding() {
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const logoImg = document.getElementById('sidebarLogoImg');
            const logoIcon = document.getElementById('sidebarLogoIcon');
            const companyNameEl = document.getElementById('sidebarCompanyName');
            const loginLogoImg = document.getElementById('loginLogoImg');
            const loginLogoIcon = document.getElementById('loginLogoIcon');
            const loginCompanyNameEl = document.getElementById('loginCompanyName');

            const companyName = (settings.companyName || 'InvoicePro').trim() || 'InvoicePro';
            if (companyNameEl) {
                companyNameEl.textContent = companyName;
            }
            if (loginCompanyNameEl) {
                loginCompanyNameEl.textContent = companyName;
            }

            if (settings.companyLogo && logoImg) {
                logoImg.src = settings.companyLogo;
                logoImg.style.display = 'block';
                if (logoIcon) logoIcon.style.display = 'none';
                if (loginLogoImg) {
                    loginLogoImg.src = settings.companyLogo;
                    loginLogoImg.style.display = 'block';
                }
                if (loginLogoIcon) loginLogoIcon.style.display = 'none';
            } else {
                if (logoImg) {
                    logoImg.removeAttribute('src');
                    logoImg.style.display = 'none';
                }
                if (logoIcon) logoIcon.style.display = 'inline-block';
                if (loginLogoImg) {
                    loginLogoImg.removeAttribute('src');
                    loginLogoImg.style.display = 'none';
                }
                if (loginLogoIcon) loginLogoIcon.style.display = 'inline-block';
            }
        }

        function saveData() {
            localStorage.setItem('pro_invoice_data', JSON.stringify({
                customers, suppliers, invoices, quotations, expenses, hrEmployees, hrAttendance, hrLeaves, hrTasks, nextInvoiceNumber, nextQuotationNumber
            }));
        }

        // ==================== DASHBOARD ====================
        function updateDashboard() {
            document.getElementById('totalCustomers').innerText = customers.length;
            document.getElementById('totalInvoices').innerText = invoices.length;
            const totalRevenue = invoices.reduce((sum, inv) => sum + convertCurrency(inv.total), 0);
            document.getElementById('totalRevenue').innerHTML = formatCurrency(totalRevenue);
            
            const currentMonth = new Date().getMonth();
            const monthRevenue = invoices.filter(inv => new Date(inv.date).getMonth() === currentMonth)
                .reduce((sum, inv) => sum + convertCurrency(inv.total), 0);
            document.getElementById('monthRevenue').innerHTML = formatCurrency(monthRevenue);
            
            updateTopCustomers();
        }

        function updateTopCustomers() {
            const customerSales = {};
            invoices.forEach(inv => {
                customerSales[inv.customerId] = (customerSales[inv.customerId] || 0) + convertCurrency(inv.total);
            });
            const topCustomers = Object.entries(customerSales)
                .sort((a,b) => b[1] - a[1])
                .slice(0,5)
                .map(([id, total]) => {
                    const customer = customers.find(c => c.id === id);
                    return `<div class="order-item"><span>${customer?.name || 'Unknown'}</span><span>${formatCurrency(total)}</span></div>`;
                }).join('');
            document.getElementById('topCustomersList').innerHTML = topCustomers || '<p>No data</p>';
        }

        let revenueChart, tagsChart;
        
        function initCharts() {
            const ctx1 = document.getElementById('revenueChart')?.getContext('2d');
            const ctx2 = document.getElementById('customerTagsChart')?.getContext('2d');
            if (ctx1) {
                revenueChart = new Chart(ctx1, {
                    type: 'bar',
                    data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label: 'Revenue', data: [0,0,0,0,0,0], backgroundColor: '#4a90e2' }] }
                });
            }
            if (ctx2) {
                tagsChart = new Chart(ctx2, {
                    type: 'doughnut',
                    data: { labels: ['VIP', 'Regular', 'New', 'Pending'], datasets: [{ data: [0,0,0,0], backgroundColor: ['#ffd700', '#4a90e2', '#28a745', '#ffc107'] }] }
                });
            }
            updateCharts();
        }

        function updateCharts() {
            const monthlyData = Array(6).fill(0);
            invoices.forEach(inv => {
                const month = new Date(inv.date).getMonth();
                if (month < 6) monthlyData[month] += convertCurrency(inv.total);
            });
            if (revenueChart) revenueChart.data.datasets[0].data = monthlyData;
            if (revenueChart) revenueChart.update();
            
            const tagCounts = { VIP: 0, Regular: 0, New: 0, Pending: 0 };
            customers.forEach(c => { if (tagCounts[c.tag] !== undefined) tagCounts[c.tag]++; });
            if (tagsChart) tagsChart.data.datasets[0].data = [tagCounts.VIP, tagCounts.Regular, tagCounts.New, tagCounts.Pending];
            if (tagsChart) tagsChart.update();
        }

        // ==================== CUSTOMER MANAGEMENT ====================
        function renderCustomers() {
            const searchTerm = document.getElementById('customerSearchInput')?.value.toLowerCase() || '';
            const tagFilter = document.getElementById('tagFilter')?.value || '';
            const statusFilter = document.getElementById('customerStatusFilter')?.value || '';
            const filtered = customers.filter(c => 
                (
                    String(c.id || '').toLowerCase().includes(searchTerm) ||
                    c.name.toLowerCase().includes(searchTerm) ||
                    (c.phone || '').toLowerCase().includes(searchTerm) ||
                    (c.email || '').toLowerCase().includes(searchTerm) ||
                    (c.company || '').toLowerCase().includes(searchTerm) ||
                    (c.address || '').toLowerCase().includes(searchTerm)
                ) &&
                (tagFilter === '' || c.tag === tagFilter) &&
                (statusFilter === '' || (c.status || 'Active') === statusFilter)
            );
            
            const container = document.getElementById('customersList');
            if (!container) return;

            if (filtered.length === 0) {
                container.innerHTML = '<div class="supplier-list-shell"><p class="supplier-empty-state">No customers found.</p></div>';
                return;
            }

            container.innerHTML = `
                <div class="supplier-list-shell">
                    <div class="supplier-list-title">Customer List</div>
                    <div class="supplier-table-wrap">
                        <table class="supplier-table">
                            <thead>
                                <tr>
                                    <th>Customer ID</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Company</th>
                                    <th>Due</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(customer => `
                                    <tr>
                                        <td class="supplier-id-cell">${escapeHtml(customer.id || '-')}</td>
                                        <td>
                                            <div class="supplier-primary-text">${escapeHtml(customer.name || '-')}</div>
                                            <div class="supplier-secondary-text">${escapeHtml(customer.email || '-')} | ${escapeHtml(customer.tag || 'New')}</div>
                                        </td>
                                        <td>${escapeHtml(customer.phone || '-')}</td>
                                        <td>${escapeHtml(customer.company || '-')}</td>
                                        <td>${formatCurrency(convertCurrency(Number(customer.dueAmount || 0)))}</td>
                                        <td>
                                            <span class="supplier-status-badge supplier-status-${String(customer.status || 'Active').toLowerCase()}">${escapeHtml(customer.status || 'Active')}</span>
                                        </td>
                                        <td>
                                            <div class="supplier-action-group">
                                                <button onclick="editCustomer('${customer.id}')" class="supplier-action-btn supplier-action-btn--edit">Edit</button>
                                                <button onclick="printCustomerDetails('${customer.id}')" class="supplier-action-btn">Print</button>
                                                <button onclick="viewContactHistory('${customer.id}')" class="supplier-action-btn">History</button>
                                                <button onclick="viewOrderHistory('${customer.id}')" class="supplier-action-btn">Orders</button>
                                                <button onclick="createInvoiceForCustomer('${customer.id}')" class="supplier-action-btn">Invoice</button>
                                                <button onclick="sendBulkMessage('${customer.id}')" class="supplier-action-btn">Message</button>
                                                <button onclick="generateCustomerQR('${customer.id}')" class="supplier-action-btn">QR</button>
                                                <button onclick="deleteCustomer('${customer.id}')" class="supplier-action-btn supplier-action-btn--delete">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        function showAddCustomerModal() {
            currentCustomerId = null;
            document.getElementById('customerModalTitle').innerText = 'Add Customer';
            document.getElementById('customerForm').reset();
            const nextId = generateCustomerCode();
            document.getElementById('customerIdDisplay').value = nextId;
            document.getElementById('customerModal').style.display = 'flex';
        }

        function editCustomer(id) {
            const customer = customers.find(c => c.id === id);
            if (customer) {
                currentCustomerId = id;
                document.getElementById('customerModalTitle').innerText = 'Edit Customer';
                document.getElementById('customerIdDisplay').value = id;
                document.getElementById('customerName').value = customer.name;
                document.getElementById('customerPhone').value = customer.phone || '';
                document.getElementById('customerEmail').value = customer.email || '';
                document.getElementById('customerCompany').value = customer.company || '';
                document.getElementById('customerVatNumber').value = customer.vatNumber || '';
                document.getElementById('customerAddress').value = customer.address || '';
                document.getElementById('customerTag').value = customer.tag || 'New';
                document.getElementById('customerCreditLimit').value = Number(customer.creditLimit || 0);
                document.getElementById('customerPaymentTerms').value = Number(customer.paymentTerms || 30);
                document.getElementById('customerType').value = customer.customerType || 'Individual';
                document.getElementById('customerStatus').value = customer.status || 'Active';
                document.getElementById('customerNotes').value = customer.notes || '';
                document.getElementById('customerOpeningBalance').value = Number(customer.openingBalance || 0);
                document.getElementById('customerOpeningBalanceType').value = customer.openingBalanceType || 'Dr';
                document.getElementById('customerClosingBalance').value = Number(customer.closingBalance || 0);
                document.getElementById('customerClosingBalanceType').value = customer.closingBalanceType || 'Dr';
                document.getElementById('customerModal').style.display = 'flex';
            }
        }

        async function deleteCustomer(id) {
            if (!confirm('Delete this customer?')) return;
            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('deleteCustomer', { customer_id: id });
                    await syncCustomersFromApi();
                    window.APIClient.showToast('Customer deleted successfully', 'success');
                } catch (error) {
                    console.error('Customer API delete failed:', error);
                    window.APIClient.showToast('Failed to delete customer', 'error');
                    return;
                }
            } else {
                customers = customers.filter(c => c.id !== id);
                saveData();
            }
            renderCustomers();
            updateDashboard();
            updateCharts();
        }

        document.getElementById('customerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customerData = {
                id: currentCustomerId || generateCustomerCode(),
                name: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                email: document.getElementById('customerEmail').value,
                company: document.getElementById('customerCompany').value,
                vatNumber: document.getElementById('customerVatNumber').value,
                address: document.getElementById('customerAddress').value,
                tag: document.getElementById('customerTag').value,
                creditLimit: parseFloat(document.getElementById('customerCreditLimit').value) || 0,
                paymentTerms: parseInt(document.getElementById('customerPaymentTerms').value, 10) || 30,
                customerType: document.getElementById('customerType').value || 'Individual',
                status: document.getElementById('customerStatus').value || 'Active',
                notes: document.getElementById('customerNotes').value,
                openingBalance: parseFloat(document.getElementById('customerOpeningBalance').value) || 0,
                openingBalanceType: document.getElementById('customerOpeningBalanceType').value || 'Dr',
                closingBalance: parseFloat(document.getElementById('customerClosingBalance').value) || 0,
                closingBalanceType: document.getElementById('customerClosingBalanceType').value || 'Dr',
                totalSpent: currentCustomerId ? customers.find(c => c.id === currentCustomerId)?.totalSpent || 0 : 0,
                totalPaid: currentCustomerId ? customers.find(c => c.id === currentCustomerId)?.totalPaid || 0 : 0,
                dueAmount: currentCustomerId ? customers.find(c => c.id === currentCustomerId)?.dueAmount || 0 : 0,
                lastPaymentDate: currentCustomerId ? customers.find(c => c.id === currentCustomerId)?.lastPaymentDate || '' : '',
                lastContact: new Date().toISOString().split('T')[0],
                contactHistory: currentCustomerId ? customers.find(c => c.id === currentCustomerId)?.contactHistory || [] : []
            };

            if (isApiEnabled()) {
                try {
                    const action = currentCustomerId ? 'updateCustomer' : 'addCustomer';
                    await window.APIClient.postData(action, { customer: normalizeCustomerToApi(customerData) });
                    await syncCustomersFromApi();
                } catch (error) {
                    console.error('Customer API save failed:', error);
                    return;
                }
            } else {
                if (currentCustomerId) {
                    const index = customers.findIndex(c => c.id === currentCustomerId);
                    customers[index] = { ...customers[index], ...customerData };
                } else {
                    customers.push(customerData);
                }
                saveData();
            }

            closeCustomerModal();
            renderCustomers();
            updateDashboard();
            updateCharts();
        });

        function viewContactHistory(customerId) {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                const historyHtml = (customer.contactHistory || []).map(h => `
                    <div class="contact-item">
                        <span><i class="fas fa-calendar"></i> ${h.date}</span>
                        <span>${h.note}</span>
                    </div>
                `).join('');
                document.getElementById('contactHistoryList').innerHTML = historyHtml || '<p>No contact history</p>';
                document.getElementById('contactHistoryModal').style.display = 'flex';
                window.currentContactCustomer = customer;
            }
        }

        function addContactNote() {
            const note = document.getElementById('newContactNote').value;
            if (note && window.currentContactCustomer) {
                window.currentContactCustomer.contactHistory = window.currentContactCustomer.contactHistory || [];
                window.currentContactCustomer.contactHistory.push({
                    date: new Date().toLocaleString(),
                    note: note
                });
                window.currentContactCustomer.lastContact = new Date().toISOString().split('T')[0];
                saveData();
                viewContactHistory(window.currentContactCustomer.id);
                document.getElementById('newContactNote').value = '';
            }
        }

        function viewOrderHistory(customerId) {
            const customerOrders = invoices.filter(inv => inv.customerId === customerId);
            const ordersHtml = customerOrders.map(order => `
                <div class="order-item">
                    <span>${order.invoiceNo}</span>
                    <span>${order.date}</span>
                    <span>${formatCurrency(convertCurrency(order.total))}</span>
                    <span class="status ${order.status}">${order.status}</span>
                </div>
            `).join('');
            document.getElementById('orderHistoryList').innerHTML = ordersHtml || '<p>No orders found</p>';
            document.getElementById('orderHistoryModal').style.display = 'flex';
        }

        function generateCustomerQR(customerId) {
            if (!isVatTaxEnabled()) {
                alert('VAT/Tax is disabled in Settings. QR code is hidden for invoice.');
                return;
            }
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                const qrContainer = document.getElementById('qrCodeContainer');
                const qrData = JSON.stringify({ name: customer.name, phone: customer.phone, email: customer.email, company: customer.company });
                qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}" alt="QR Code">`;
                document.getElementById('qrModal').style.display = 'flex';
            }
        }

        function createInvoiceForCustomer(customerId) {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                createNewInvoice();
                document.getElementById('customerSelect').value = customerId;
                loadCustomerData();
            }
        }

        function sendBulkMessage(customerId) {
            const customer = customers.find(c => c.id === customerId);
            if (customer && customer.phone) {
                const message = prompt('Enter message to send:', `Hello ${customer.name}, special offer for you!`);
                if (message) {
                    window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                    addContactNoteToCustomer(customerId, `WhatsApp: ${message.substring(0, 50)}...`);
                }
            } else {
                alert('Customer phone number not available');
            }
        }

                function printCustomerDetails(customerId) {
                        const customer = customers.find(c => c.id === customerId);
                        if (!customer) return;

                        const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
                        const companyName = settings.companyName || 'Company';
                        const openingBalance = formatCurrency(convertCurrency(Number(customer.openingBalance || 0)));
                        const closingBalance = formatCurrency(convertCurrency(Number(customer.closingBalance || 0)));
                        const totalSpent = formatCurrency(convertCurrency(Number(customer.totalSpent || 0)));

                        const w = window.open('', '_blank', 'width=820,height=900');
                        if (!w) return;

                        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Customer Details - ${escapeHtml(customer.name)}</title>
<style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 740px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .head { background: #1e293b; color: #fff; padding: 18px 22px; }
    .head h2 { margin: 0; font-size: 22px; }
    .head p { margin: 6px 0 0; opacity: .85; font-size: 13px; }
    .body { padding: 18px 22px; }
    .row { display: flex; gap: 12px; border-bottom: 1px solid #e2e8f0; padding: 10px 0; align-items: flex-start; }
    .row:last-child { border-bottom: none; }
    .label { width: 180px; min-width: 180px; font-weight: 700; color: #334155; }
    .value { flex: 1; }
    .balance { font-weight: 700; }
    .footer { padding: 12px 22px 18px; color: #64748b; font-size: 12px; }
    @media print { body { background: #fff; padding: 0; } .card { border: none; } }
</style></head><body>
<div class="card">
    <div class="head">
        <h2>${escapeHtml(customer.name)}</h2>
        <p>${escapeHtml(companyName)}</p>
    </div>
    <div class="body">
        <div class="row"><div class="label">Phone</div><div class="value">${escapeHtml(customer.phone || '-')}</div></div>
        <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(customer.email || '-')}</div></div>
        <div class="row"><div class="label">Company</div><div class="value">${escapeHtml(customer.company || '-')}</div></div>
        <div class="row"><div class="label">VAT / TAX No.</div><div class="value">${escapeHtml(customer.vatNumber || '-')}</div></div>
        <div class="row"><div class="label">Address</div><div class="value">${escapeHtml(customer.address || '-')}</div></div>
        <div class="row"><div class="label">Opening Balance</div><div class="value balance">${openingBalance} ${escapeHtml(customer.openingBalanceType || 'Dr')}</div></div>
        <div class="row"><div class="label">Closing Balance</div><div class="value balance">${closingBalance} ${escapeHtml(customer.closingBalanceType || 'Dr')}</div></div>
        <div class="row"><div class="label">Total Spent</div><div class="value">${totalSpent}</div></div>
        <div class="row"><div class="label">Last Contact</div><div class="value">${escapeHtml(customer.lastContact || '-')}</div></div>
        <div class="row"><div class="label">Notes</div><div class="value">${escapeHtml(customer.notes || '-')}</div></div>
    </div>
    <div class="footer">Generated on ${new Date().toLocaleString()}</div>
</div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
                        w.document.close();
                }

        function addContactNoteToCustomer(customerId, note) {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                customer.contactHistory = customer.contactHistory || [];
                customer.contactHistory.push({ date: new Date().toLocaleString(), note: note });
                saveData();
            }
        }

        function filterCustomers() {
            renderCustomers();
        }

        function calculateCustomerFinancials(customerId) {
            const customerInvoices = invoices.filter(inv => String(inv.customerId || '') === String(customerId || ''));
            const totalPurchase = customerInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
            const totalPaid = customerInvoices
                .filter(inv => String(inv.status || '').toLowerCase() === 'paid')
                .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
            const dueAmount = Math.max(totalPurchase - totalPaid, 0);
            const orderCount = customerInvoices.length;
            const sortedDates = customerInvoices
                .map(inv => inv.date)
                .filter(Boolean)
                .sort();
            const lastOrderDate = sortedDates.length ? sortedDates[sortedDates.length - 1] : '';
            const lastPaymentDate = customerInvoices
                .filter(inv => String(inv.status || '').toLowerCase() === 'paid')
                .map(inv => inv.date)
                .filter(Boolean)
                .sort()
                .pop() || '';

            return {
                totalPurchase,
                totalPaid,
                dueAmount,
                orderCount,
                lastOrderDate,
                lastPaymentDate
            };
        }

        async function refreshCustomerFinancials(customerId) {
            const customer = customers.find(c => String(c.id) === String(customerId));
            if (!customer) return;

            const financials = calculateCustomerFinancials(customerId);
            customer.totalSpent = financials.totalPurchase;
            customer.totalPaid = financials.totalPaid;
            customer.dueAmount = financials.dueAmount;
            customer.lastPaymentDate = financials.lastPaymentDate;

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('updateCustomer', {
                        customer: normalizeCustomerToApi(customer)
                    });
                } catch (error) {
                    console.error('Failed to refresh customer financials via API:', error);
                }
            } else {
                saveData();
            }
        }

        // ==================== SUPPLIER MANAGEMENT ====================
        async function showSuppliers() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('suppliersView').style.display = 'block';
            setActiveNav('navSuppliers');
            if (isApiEnabled()) {
                try {
                    await Promise.all([syncSuppliersFromApi(), syncProductsFromApi()]);
                } catch (error) {
                    console.error(error);
                }
            }
            renderSuppliers();
        }

        function renderSuppliers() {
            const searchTerm = document.getElementById('supplierSearchInput')?.value.toLowerCase() || '';
            const statusFilter = document.getElementById('supplierStatusFilter')?.value || '';
            const filtered = suppliers.filter(s =>
                String(s.id || '').toLowerCase().includes(searchTerm) ||
                s.name.toLowerCase().includes(searchTerm) ||
                (s.phone || '').toLowerCase().includes(searchTerm) ||
                (s.email || '').toLowerCase().includes(searchTerm) ||
                (s.company || '').toLowerCase().includes(searchTerm) ||
                (s.address || '').toLowerCase().includes(searchTerm)
            ).filter(s => statusFilter === '' || (s.status || 'Active') === statusFilter);

            const container = document.getElementById('suppliersList');
            if (!container) return;

            if (filtered.length === 0) {
                container.innerHTML = '<div class="supplier-list-shell"><p class="supplier-empty-state">No suppliers found.</p></div>';
                return;
            }

            container.innerHTML = `
                <div class="supplier-list-shell">
                    <div class="supplier-list-title">Supplier List</div>
                    <div class="supplier-table-wrap">
                        <table class="supplier-table">
                            <thead>
                                <tr>
                                    <th>Supplier ID</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Company</th>
                                    <th>Due Balance</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(supplier => `
                                    <tr>
                                        <td class="supplier-id-cell">${escapeHtml(supplier.id || '-')}</td>
                                        <td>
                                            <div class="supplier-primary-text">${escapeHtml(supplier.name || '-')}</div>
                                            <div class="supplier-secondary-text">${escapeHtml(supplier.contactPerson || supplier.email || '')}</div>
                                        </td>
                                        <td>${escapeHtml(supplier.phone || '-')}</td>
                                        <td>${escapeHtml(supplier.company || '-')}</td>
                                        <td>${formatCurrency(convertCurrency(Number(getSupplierFinancials(supplier).dueAmount || 0)))}</td>
                                        <td>
                                            <span class="supplier-status-badge supplier-status-${String(supplier.status || 'Active').toLowerCase()}">${escapeHtml(supplier.status || 'Active')}</span>
                                        </td>
                                        <td>
                                            <div class="supplier-action-group">
                                                <button onclick="editSupplier('${supplier.id}')" class="supplier-action-btn supplier-action-btn--edit">Edit</button>
                                                <button onclick="addSupplierPurchase('${supplier.id}')" class="supplier-action-btn">Purchase</button>
                                                <button onclick="paySupplierBill('${supplier.id}')" class="supplier-action-btn">Pay</button>
                                                <button onclick="viewSupplierReport('${supplier.id}')" class="supplier-action-btn">Report</button>
                                                <button onclick="viewSupplierPurchaseHistory('${supplier.id}')" class="supplier-action-btn">History</button>
                                                <button onclick="deleteSupplier('${supplier.id}')" class="supplier-action-btn supplier-action-btn--delete">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        function filterSuppliers() {
            renderSuppliers();
        }

        function showAddSupplierModal() {
            currentSupplierId = null;
            document.getElementById('supplierModalTitle').innerText = 'Add Supplier';
            document.getElementById('supplierForm').reset();
            document.getElementById('supplierTotalPurchase').value = 0;
            document.getElementById('supplierTotalPaid').value = 0;
            document.getElementById('supplierDueAmount').value = 0;
            document.getElementById('supplierModal').style.display = 'flex';
        }

        function recalcSupplierDue() {
            const purchase = parseFloat(document.getElementById('supplierTotalPurchase').value) || 0;
            const paid = parseFloat(document.getElementById('supplierTotalPaid').value) || 0;
            document.getElementById('supplierDueAmount').value = Math.max(0, purchase - paid).toFixed(2);
        }

        function editSupplier(id) {
            const supplier = suppliers.find(s => s.id === id);
            if (!supplier) return;
            const financials = getSupplierFinancials(supplier);

            currentSupplierId = id;
            document.getElementById('supplierModalTitle').innerText = 'Edit Supplier';
            document.getElementById('supplierName').value = supplier.name || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierCompany').value = supplier.company || '';
            document.getElementById('supplierVatNumber').value = supplier.vatNumber || '';
            document.getElementById('supplierPaymentTerms').value = Number(supplier.paymentTerms || 30);
            document.getElementById('supplierStatus').value = supplier.status || 'Active';
            document.getElementById('supplierContactPerson').value = supplier.contactPerson || '';
            document.getElementById('supplierBankDetails').value = supplier.bankDetails || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';
            document.getElementById('supplierOpeningBalance').value = Number(supplier.openingBalance || 0);
            document.getElementById('supplierOpeningBalanceType').value = supplier.openingBalanceType || 'Dr';
            document.getElementById('supplierClosingBalance').value = Number(supplier.closingBalance || 0);
            document.getElementById('supplierClosingBalanceType').value = supplier.closingBalanceType || 'Dr';
            document.getElementById('supplierTotalPurchase').value = financials.totalPurchase.toFixed(2);
            document.getElementById('supplierTotalPaid').value = Number(supplier.totalPaid || 0).toFixed(2);
            document.getElementById('supplierDueAmount').value = financials.dueAmount.toFixed(2);
            document.getElementById('supplierModal').style.display = 'flex';
        }

        function printSupplierDetails(supplierId) {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) return;
            const financials = getSupplierFinancials(supplier);

            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const companyName = settings.companyName || 'Company';
            const openingBalance = formatCurrency(convertCurrency(Number(supplier.openingBalance || 0)));
            const closingBalance = formatCurrency(convertCurrency(Number(supplier.closingBalance || 0)));
            const totalPurchase = formatCurrency(convertCurrency(financials.totalPurchase));
            const totalPaid = formatCurrency(convertCurrency(financials.totalPaid));
            const dueAmount = formatCurrency(convertCurrency(financials.dueAmount));

            const w = window.open('', '_blank', 'width=820,height=900');
            if (!w) return;

            w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Supplier Details - ${escapeHtml(supplier.name)}</title>
<style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 740px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .head { background: #1e293b; color: #fff; padding: 18px 22px; }
    .head h2 { margin: 0; font-size: 22px; }
    .head p { margin: 6px 0 0; opacity: .85; font-size: 13px; }
    .body { padding: 18px 22px; }
    .row { display: flex; gap: 12px; border-bottom: 1px solid #e2e8f0; padding: 10px 0; align-items: flex-start; }
    .row:last-child { border-bottom: none; }
    .label { width: 180px; min-width: 180px; font-weight: 700; color: #334155; }
    .value { flex: 1; }
    .balance { font-weight: 700; }
    .footer { padding: 12px 22px 18px; color: #64748b; font-size: 12px; }
    @media print { body { background: #fff; padding: 0; } .card { border: none; } }
</style></head><body>
<div class="card">
    <div class="head">
        <h2>${escapeHtml(supplier.name)}</h2>
        <p>${escapeHtml(companyName)}</p>
    </div>
    <div class="body">
        <div class="row"><div class="label">Phone</div><div class="value">${escapeHtml(supplier.phone || '-')}</div></div>
        <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(supplier.email || '-')}</div></div>
        <div class="row"><div class="label">Company</div><div class="value">${escapeHtml(supplier.company || '-')}</div></div>
        <div class="row"><div class="label">VAT / TAX No.</div><div class="value">${escapeHtml(supplier.vatNumber || '-')}</div></div>
        <div class="row"><div class="label">Address</div><div class="value">${escapeHtml(supplier.address || '-')}</div></div>
        <div class="row"><div class="label">Contact Person</div><div class="value">${escapeHtml(supplier.contactPerson || '-')}</div></div>
        <div class="row"><div class="label">Bank Details</div><div class="value">${escapeHtml(supplier.bankDetails || '-')}</div></div>
        <div class="row"><div class="label">Status</div><div class="value">${escapeHtml(supplier.status || 'Active')}</div></div>
        <div class="row"><div class="label">Payment Terms</div><div class="value">${escapeHtml(String(supplier.paymentTerms || 30))} Days</div></div>
        <div class="row"><div class="label">Total Purchases</div><div class="value">${totalPurchase}</div></div>
        <div class="row"><div class="label">Total Paid</div><div class="value">${totalPaid}</div></div>
        <div class="row"><div class="label">Due Amount</div><div class="value balance">${dueAmount}</div></div>
        <div class="row"><div class="label">Opening Balance</div><div class="value balance">${openingBalance} ${escapeHtml(supplier.openingBalanceType || 'Dr')}</div></div>
        <div class="row"><div class="label">Closing Balance</div><div class="value balance">${closingBalance} ${escapeHtml(supplier.closingBalanceType || 'Dr')}</div></div>
        <div class="row"><div class="label">Notes</div><div class="value">${escapeHtml(supplier.notes || '-')}</div></div>
    </div>
    <div class="footer">Generated on ${new Date().toLocaleString()}</div>
</div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
            w.document.close();
        }

        async function deleteSupplier(id) {
            if (!confirm('Delete this supplier?')) return;
            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('deleteSupplier', { id: id });
                    await syncSuppliersFromApi();
                } catch (error) {
                    console.error('Supplier API delete failed:', error);
                    return;
                }
            } else {
                suppliers = suppliers.filter(s => s.id !== id);
                saveData();
            }
            removeSupplierPurchaseHistory(id);
            renderSuppliers();
            updateSupplierOptions();
        }

        function closeSupplierModal() {
            document.getElementById('supplierModal').style.display = 'none';
        }

        function populateSupplierPurchaseProductOptions(supplierId) {
            const datalist = document.getElementById('addPurchaseProductOptions');
            if (!datalist) return;

            const options = savedProducts
                .filter(product => String(product.supplierId || '') === String(supplierId || ''))
                .map(product => `<option value="${escapeHtml(product.name || '')}"></option>`)
                .join('');

            datalist.innerHTML = options;
        }

        function updateSupplierPurchaseTotal() {
            const quantity = parseFloat(document.getElementById('addPurchaseQuantity')?.value) || 0;
            const unitCost = parseFloat(document.getElementById('addPurchaseUnitCost')?.value) || 0;
            const totalAmount = quantity * unitCost;
            const totalField = document.getElementById('addPurchaseAmount');
            if (totalField) {
                totalField.value = totalAmount > 0 ? totalAmount.toFixed(2) : '0';
            }
        }

        function handleSupplierPurchaseProductChange() {
            const productName = (document.getElementById('addPurchaseProductName')?.value || '').trim().toLowerCase();
            if (!productName) {
                updateSupplierPurchaseTotal();
                return;
            }

            const matchingProduct = savedProducts.find(product =>
                String(product.supplierId || '') === String(currentSupplierId || '') &&
                String(product.name || '').trim().toLowerCase() === productName
            );

            if (matchingProduct) {
                const unitCostField = document.getElementById('addPurchaseUnitCost');
                if (unitCostField && !Number(unitCostField.value)) {
                    unitCostField.value = Number(matchingProduct.cost || 0).toFixed(2);
                }
            }

            updateSupplierPurchaseTotal();
        }

        function addSupplierPurchase(id) {
            const supplier = suppliers.find(s => String(s.id) === String(id));
            if (!supplier) return;

            const financials = getSupplierFinancials(supplier);
            currentSupplierId = String(id);
            populateSupplierPurchaseProductOptions(currentSupplierId);
            document.getElementById('addPurchaseSupplierName').textContent = supplier.name || 'Supplier';
            document.getElementById('addPurchaseCurrentTotal').innerHTML = formatCurrency(convertCurrency(financials.totalPurchase));
            document.getElementById('addPurchaseInvoiceNo').value = `PINV-${Date.now().toString().slice(-6)}`;
            document.getElementById('addPurchaseProductName').value = '';
            document.getElementById('addPurchaseQuantity').value = '1';
            document.getElementById('addPurchaseUnitCost').value = '0';
            document.getElementById('addPurchaseAmount').value = '0';
            document.getElementById('addPurchaseDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('addPurchaseNote').value = '';
            document.getElementById('supplierAddPurchaseModal').style.display = 'flex';
        }

        function closeSupplierAddPurchaseModal() {
            document.getElementById('supplierAddPurchaseModal').style.display = 'none';
            currentSupplierId = null;
        }

        function viewSupplierPurchaseHistory(id) {
            const supplier = suppliers.find(s => String(s.id) === String(id));
            if (!supplier) return;

            currentSupplierHistoryId = String(id);
            const historyContainer = document.getElementById('supplierPurchaseHistoryList');
            document.getElementById('supplierPurchaseHistorySupplierName').textContent = supplier.name || 'Supplier';
            if (historyContainer) {
                historyContainer.innerHTML = renderSupplierPurchaseHistoryMarkup(id, 100, 'No purchase history found for this supplier.');
            }
            document.getElementById('supplierPurchaseHistoryModal').style.display = 'flex';
        }

        function closeSupplierPurchaseHistoryModal() {
            document.getElementById('supplierPurchaseHistoryModal').style.display = 'none';
            currentSupplierHistoryId = null;
        }

        async function processSupplierAddPurchase() {
            if (!currentSupplierId) return;

            const invoiceNo = (document.getElementById('addPurchaseInvoiceNo').value || '').trim();
            const productName = (document.getElementById('addPurchaseProductName').value || '').trim();
            const quantity = parseFloat(document.getElementById('addPurchaseQuantity').value);
            const unitCost = parseFloat(document.getElementById('addPurchaseUnitCost').value);
            const amount = (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitCost) ? unitCost : 0);

            if (!invoiceNo) {
                if (window.APIClient && window.APIClient.showToast) {
                    window.APIClient.showToast('Please enter an invoice number.', 'error');
                } else {
                    alert('Please enter an invoice number.');
                }
                return;
            }

            if (!productName) {
                if (window.APIClient && window.APIClient.showToast) {
                    window.APIClient.showToast('Please enter a product name.', 'error');
                } else {
                    alert('Please enter a product name.');
                }
                return;
            }

            if (!quantity || quantity <= 0 || !unitCost || unitCost <= 0 || !amount || amount <= 0) {
                if (window.APIClient && window.APIClient.showToast) {
                    window.APIClient.showToast('Please enter valid quantity and unit cost.', 'error');
                } else {
                    alert('Please enter valid quantity and unit cost.');
                }
                return;
            }

            const purchaseDate = document.getElementById('addPurchaseDate').value || new Date().toISOString().split('T')[0];
            const purchaseNote = (document.getElementById('addPurchaseNote').value || '').trim();
            const idx = suppliers.findIndex(s => String(s.id) === String(currentSupplierId));
            if (idx === -1) return;

            const supplier = { ...suppliers[idx] };
            const financials = getSupplierFinancials(supplier);
            supplier.totalPurchase = Number(financials.totalPurchase || 0) + amount;
            supplier.totalPaid = Number(supplier.totalPaid || 0);
            supplier.dueAmount = Math.max(0, supplier.totalPurchase - supplier.totalPaid);
            supplier.lastPurchaseDate = purchaseDate;

            const newPurchaseId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            addSupplierPurchaseHistoryEntry(currentSupplierId, {
                id: newPurchaseId,
                date: purchaseDate,
                supplierId: currentSupplierId,
                invoiceNo,
                productName,
                quantity,
                unitCost,
                total: amount,
                paidAmount: 0,
                dueAmount: amount,
                status: 'Unpaid',
                note: purchaseNote
            });

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('addSupplierPurchase', {
                        purchase: {
                            id: newPurchaseId,
                            supplier_id: currentSupplierId,
                            product_name: productName,
                            quantity,
                            unit_price: unitCost,
                            total: amount,
                            vat_amount: 0,
                            vat_rate: 0,
                            paid_amount: 0,
                            due_amount: amount,
                            purchase_date: purchaseDate,
                            due_date: '',
                            status: 'Unpaid',
                            notes: purchaseNote
                        }
                    });
                    await window.APIClient.postData('addSupplierTransaction', {
                        transaction: {
                            id: `ST-${Date.now()}`,
                            supplier_id: currentSupplierId,
                            type: 'Purchase',
                            amount,
                            date: purchaseDate,
                            note: `Purchase: ${invoiceNo} - ${productName}`
                        }
                    });
                    await window.APIClient.postData('updateSupplier', { supplier: normalizeSupplierToApi(supplier) });
                    await syncSuppliersFromApi();
                } catch (error) {
                    console.error('Add purchase API failed:', error);
                    return;
                }
            } else {
                suppliers[idx] = supplier;
                saveData();
            }

            closeSupplierAddPurchaseModal();
            renderSuppliers();
            if (window.APIClient && window.APIClient.showToast) {
                window.APIClient.showToast(`Purchase added: ${productName}`, 'success');
            }
        }

        function paySupplierBill(id) {
            const supplier = suppliers.find(s => s.id === id);
            if (!supplier) return;
            const financials = getSupplierFinancials(supplier);
            const invoiceSelect = document.getElementById('payBillInvoiceSelect');
            const outstandingEntries = getOutstandingSupplierPurchaseEntries(id);
            currentSupplierId = id;
            document.getElementById('payBillSupplierName').textContent = supplier.name;
            document.getElementById('payBillDueAmount').innerHTML = formatCurrency(convertCurrency(financials.dueAmount));
            if (invoiceSelect) {
                invoiceSelect.innerHTML = outstandingEntries.length
                    ? outstandingEntries.map(entry => `<option value="${entry.id}">${escapeHtml(entry.invoiceNo)} - ${escapeHtml(entry.productName)} (${formatCurrency(convertCurrency(Number(entry.dueAmount || 0)))})</option>`).join('')
                    : '<option value="">No unpaid invoices available</option>';
            }
            currentSupplierPaymentEntryId = outstandingEntries[0]?.id || null;
            handleSupplierPaymentInvoiceChange();
            document.getElementById('payBillDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('payBillNote').value = '';
            document.getElementById('supplierPayBillModal').style.display = 'flex';
        }

        function handleSupplierPaymentInvoiceChange() {
            const invoiceSelect = document.getElementById('payBillInvoiceSelect');
            const selectedEntryId = invoiceSelect?.value || '';
            const entry = getSupplierPurchaseHistory(currentSupplierId).find(item => String(item.id) === String(selectedEntryId));

            currentSupplierPaymentEntryId = entry?.id || null;
            document.getElementById('payBillInvoiceProduct').textContent = entry?.productName || '-';
                document.getElementById('payBillInvoiceTotal').innerHTML = entry ? formatCurrency(convertCurrency(Number(entry.total || 0))) : '-';
                document.getElementById('payBillInvoicePaid').innerHTML = entry ? formatCurrency(convertCurrency(Number(entry.paidAmount || 0))) : '-';
                document.getElementById('payBillInvoiceDue').innerHTML = entry ? formatCurrency(convertCurrency(Number(entry.dueAmount || 0))) : '-';
            document.getElementById('payBillAmount').value = entry ? Number(entry.dueAmount || 0).toFixed(2) : '';
        }

        function closeSupplierPayBillModal() {
            document.getElementById('supplierPayBillModal').style.display = 'none';
            currentSupplierId = null;
            currentSupplierPaymentEntryId = null;
        }

        async function processSupplierPayment(printVoucher = false) {
            if (!currentSupplierId) return;
            if (!currentSupplierPaymentEntryId) {
                if (window.APIClient && window.APIClient.showToast) {
                    window.APIClient.showToast('Select an invoice to pay.', 'error');
                } else {
                    alert('Select an invoice to pay.');
                }
                return;
            }

            const amount = parseFloat(document.getElementById('payBillAmount').value);
            const paymentNote = (document.getElementById('payBillNote').value || '').trim();
            if (!amount || amount <= 0) {
                if (window.APIClient && window.APIClient.showToast) {
                    window.APIClient.showToast('Please enter a valid payment amount.', 'error');
                } else {
                    alert('Please enter a valid payment amount.');
                }
                return;
            }
            const payDate = document.getElementById('payBillDate').value || new Date().toISOString().split('T')[0];
            const idx = suppliers.findIndex(s => s.id === currentSupplierId);
            if (idx === -1) return;

            const purchaseEntry = getSupplierPurchaseHistory(currentSupplierId).find(entry => String(entry.id) === String(currentSupplierPaymentEntryId));
            if (!purchaseEntry) {
                alert('Selected invoice was not found.');
                return;
            }
            if (amount > Number(purchaseEntry.dueAmount || 0)) {
                alert(`Payment amount cannot exceed invoice due ${formatCurrencyPlain(convertCurrency(Number(purchaseEntry.dueAmount || 0)))}`);
                return;
            }

            const supplier = { ...suppliers[idx] };
            const financials = getSupplierFinancials(supplier);
            const paymentRecordId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const voucherNo = generateSupplierPaymentVoucherCode();
            const voucherData = {
                voucherNo,
                paymentId: paymentRecordId,
                supplierName: supplier.name || '',
                supplierCompany: supplier.company || '',
                supplierPhone: supplier.phone || '',
                invoiceNo: purchaseEntry.invoiceNo || '',
                productName: purchaseEntry.productName || '',
                invoiceTotal: Number(purchaseEntry.total || 0),
                previousPaid: Number(purchaseEntry.paidAmount || 0),
                previousDue: Number(purchaseEntry.dueAmount || 0),
                paidAmount: amount,
                remainingDue: Math.max(0, Number(purchaseEntry.dueAmount || 0) - amount),
                paymentDate: payDate,
                note: paymentNote
            };
            supplier.totalPurchase = financials.totalPurchase;
            supplier.totalPaid = Number(supplier.totalPaid || 0) + amount;
            supplier.dueAmount = Math.max(0, supplier.totalPurchase - supplier.totalPaid);
            supplier.lastPurchaseDate = payDate;

            updateSupplierPurchaseHistoryEntry(currentSupplierId, currentSupplierPaymentEntryId, entry => {
                const nextPaidAmount = Number(entry.paidAmount || 0) + amount;
                const nextDueAmount = Math.max(0, Number(entry.total || 0) - nextPaidAmount);
                const paymentHistory = Array.isArray(entry.paymentHistory) ? [...entry.paymentHistory] : [];
                paymentHistory.unshift({
                    id: paymentRecordId,
                    voucherNo,
                    date: payDate,
                    amount,
                    note: paymentNote
                });
                return {
                    ...entry,
                    paidAmount: nextPaidAmount,
                    dueAmount: nextDueAmount,
                    status: nextDueAmount <= 0 ? 'Paid' : 'Partial',
                    paymentHistory
                };
            });

            if (isApiEnabled()) {
                try {
                    const nextPaidAmount = Number(purchaseEntry.paidAmount || 0) + amount;
                    const nextDueAmount = Math.max(0, Number(purchaseEntry.dueAmount || 0) - amount);
                    await window.APIClient.postData('addSupplierPayment', {
                        payment: {
                            id: paymentRecordId,
                            supplier_id: currentSupplierId,
                            purchase_id: currentSupplierPaymentEntryId,
                            voucher_no: voucherNo,
                            amount,
                            payment_date: payDate,
                            payment_method: 'Cash',
                            notes: paymentNote
                        }
                    });
                    await window.APIClient.postData('updateSupplierPurchase', {
                        purchase: {
                            id: currentSupplierPaymentEntryId,
                            supplier_id: currentSupplierId,
                            product_name: purchaseEntry.productName || '',
                            quantity: purchaseEntry.quantity || 0,
                            unit_price: purchaseEntry.unitCost || 0,
                            total: purchaseEntry.total || 0,
                            vat_amount: 0,
                            vat_rate: 0,
                            paid_amount: nextPaidAmount,
                            due_amount: nextDueAmount,
                            purchase_date: purchaseEntry.date || '',
                            due_date: '',
                            status: nextDueAmount <= 0 ? 'Paid' : 'Partial',
                            notes: purchaseEntry.note || ''
                        }
                    });
                    await window.APIClient.postData('addSupplierTransaction', {
                        transaction: {
                            id: `ST-${Date.now()}`,
                            supplier_id: currentSupplierId,
                            type: 'Payment',
                            amount,
                            date: payDate,
                            note: `Payment: ${voucherNo} for invoice ${purchaseEntry.invoiceNo || ''}`
                        }
                    });
                    await window.APIClient.postData('updateSupplier', { supplier: normalizeSupplierToApi(supplier) });
                    await syncSuppliersFromApi();
                } catch (error) {
                    console.error('Pay bill API failed:', error);
                    return;
                }
            } else {
                suppliers[idx] = supplier;
                saveData();
            }
            closeSupplierPayBillModal();
            renderSuppliers();
            if (window.APIClient && window.APIClient.showToast) {
                window.APIClient.showToast(`Payment saved for invoice ${purchaseEntry.invoiceNo}`, 'success');
            }
            if (printVoucher) {
                printSupplierPaymentVoucher(voucherData);
            }
        }

        document.getElementById('supplierForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const supplierData = {
                id: currentSupplierId || generateSupplierCode(),
                name: document.getElementById('supplierName').value,
                phone: document.getElementById('supplierPhone').value,
                email: document.getElementById('supplierEmail').value,
                company: document.getElementById('supplierCompany').value,
                vatNumber: document.getElementById('supplierVatNumber').value,
                paymentTerms: parseInt(document.getElementById('supplierPaymentTerms').value, 10) || 30,
                status: document.getElementById('supplierStatus').value || 'Active',
                contactPerson: document.getElementById('supplierContactPerson').value,
                bankDetails: document.getElementById('supplierBankDetails').value,
                address: document.getElementById('supplierAddress').value,
                notes: document.getElementById('supplierNotes').value,
                totalPurchase: Math.max(
                    parseFloat(document.getElementById('supplierTotalPurchase').value) || 0,
                    getSupplierProductPurchaseTotal(currentSupplierId || '')
                ),
                totalPaid: parseFloat(document.getElementById('supplierTotalPaid').value) || 0,
                dueAmount: 0,
                lastPurchaseDate: currentSupplierId ? suppliers.find(s => s.id === currentSupplierId)?.lastPurchaseDate || '' : '',
                openingBalance: parseFloat(document.getElementById('supplierOpeningBalance').value) || 0,
                openingBalanceType: document.getElementById('supplierOpeningBalanceType').value || 'Dr',
                closingBalance: parseFloat(document.getElementById('supplierClosingBalance').value) || 0,
                closingBalanceType: document.getElementById('supplierClosingBalanceType').value || 'Dr'
            };

            supplierData.dueAmount = Math.max(0, supplierData.totalPurchase - supplierData.totalPaid);

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData(currentSupplierId ? 'updateSupplier' : 'addSupplier', {
                        supplier: normalizeSupplierToApi(supplierData)
                    });
                    await syncSuppliersFromApi();
                } catch (error) {
                    console.error('Supplier API save failed:', error);
                    return;
                }
            } else {
                if (currentSupplierId) {
                    const index = suppliers.findIndex(s => s.id === currentSupplierId);
                    if (index !== -1) suppliers[index] = supplierData;
                } else {
                    suppliers.push(supplierData);
                }
                saveData();
            }
            closeSupplierModal();
            renderSuppliers();
            updateSupplierOptions();
        });

        // ==================== INVOICE MANAGEMENT ====================
        let currentItems = [];

        function generateInvoiceNumber() {
            document.getElementById('invoiceNoDisplay').value = `INV-${nextInvoiceNumber}`;
        }

        function renderCustomerSelect() {
            const select = document.getElementById('customerSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Select Existing Customer --</option>' + 
                    customers.map(c => `<option value="${c.id}">${c.name} (${c.phone || ''})</option>`).join('');
            }
        }

        function renderQuotationCustomerSelect() {
            const select = document.getElementById('quotationCustomerSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Select Customer --</option>' + 
                    customers.map(c => `<option value="${c.name}">${c.name} (${c.phone || ''})</option>`).join('');
            }
        }

        function loadCustomerData() {
            const customerId = document.getElementById('customerSelect').value;
            if (customerId) {
                const customer = customers.find(c => c.id === customerId);
                if (customer) {
                    populateInvoiceCustomerFields({
                        customerId: customer.id,
                        customerName: customer.name,
                        customerPhone: customer.phone,
                        customerEmail: customer.email,
                        customerCompany: customer.company,
                        customerVatNumber: customer.vatNumber,
                        customerAddress: customer.address
                    });
                }
            }
            updatePreview();
        }

        function findCustomerRecord(customerId = '', customerName = '') {
            if (customerId) {
                const customerById = customers.find(c => String(c.id) === String(customerId));
                if (customerById) {
                    return customerById;
                }
            }

            const normalizedName = String(customerName || '').trim().toLowerCase();
            if (!normalizedName) {
                return null;
            }

            return customers.find(c => String(c.name || '').trim().toLowerCase() === normalizedName) || null;
        }

        function populateInvoiceCustomerFields(customerData = {}) {
            const fieldValues = {
                customerNameInput: customerData.customerName || '',
                customerPhoneInput: customerData.customerPhone || '',
                customerEmailInput: customerData.customerEmail || '',
                customerCompanyInput: customerData.customerCompany || '',
                customerVatInput: customerData.customerVatNumber || '',
                customerAddressInput: customerData.customerAddress || ''
            };

            Object.entries(fieldValues).forEach(([fieldId, value]) => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = value;
                }
            });

            const customerSelect = document.getElementById('customerSelect');
            if (customerSelect) {
                customerSelect.value = customerData.customerId || '';
            }
        }

        function getInvoiceCustomerSnapshot(source = {}) {
            const customerSelect = document.getElementById('customerSelect');
            const selectedCustomerId = source.customerId || customerSelect?.value || '';
            const formCustomerName = document.getElementById('customerNameInput')?.value || '';
            const selectedCustomer = findCustomerRecord(selectedCustomerId, formCustomerName || source.customerName || '');

            return {
                customerId: selectedCustomerId || selectedCustomer?.id || '',
                customerName: formCustomerName || source.customerName || selectedCustomer?.name || '',
                customerPhone: document.getElementById('customerPhoneInput')?.value || source.customerPhone || selectedCustomer?.phone || '',
                customerEmail: document.getElementById('customerEmailInput')?.value || source.customerEmail || selectedCustomer?.email || '',
                customerCompany: document.getElementById('customerCompanyInput')?.value || source.customerCompany || selectedCustomer?.company || '',
                customerVatNumber: document.getElementById('customerVatInput')?.value || source.customerVatNumber || selectedCustomer?.vatNumber || '',
                customerAddress: document.getElementById('customerAddressInput')?.value || source.customerAddress || selectedCustomer?.address || ''
            };
        }

        let itemCounter = 0;
        let quotationItemCounter = 0;
        
        function loadSavedProducts() {
            const stored = localStorage.getItem('savedProducts');
            if (stored) {
                try { savedProducts = JSON.parse(stored); } catch (err) { savedProducts = []; }
            }
            if (!savedProducts || savedProducts.length === 0) {
                    savedProducts = [];
            }
            savedProducts = savedProducts.map(product => ({
                id: product.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: product.name,
                description: product.description,
                price: product.price,
                tax: product.tax,
                supplierId: product.supplierId || '',
                supplierName: product.supplierName || '',
                cost: product.cost || 0,
                vatIncluded: Boolean(product.vatIncluded),
                dontUpdateQty: Boolean(product.dontUpdateQty)
            }));
            savedProducts = filterRemovedProducts(savedProducts);
            localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
            updateSavedProductsDatalist();
            updateSupplierOptions();
        }

        function updateSupplierOptions() {
            const supplierSelect = document.getElementById('productModalSupplier');
            if (!supplierSelect) return;
            supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>' + suppliers.map(s =>
                `<option value="${s.id}">${escapeHtml(s.name)}</option>`
            ).join('');
        }

        function showAddProductModal() {
            currentProductId = null;
            updateSupplierOptions();
            document.getElementById('productForm').reset();
            document.getElementById('productModalPrice').value = '0';
            document.getElementById('productModalTax').value = '15';
            document.getElementById('productModalCost').value = '0';
            document.getElementById('productModalVatIncluded').checked = false;
            document.getElementById('productModalDontUpdateQty').checked = false;
            const modalTitle = document.getElementById('productModalTitle');
            if (modalTitle) modalTitle.textContent = 'Add Product / Service';
            const saveButton = document.getElementById('productModalSubmitBtn');
            if (saveButton) saveButton.textContent = 'Save Product';
            document.getElementById('productModal').style.display = 'flex';
        }

        function editProduct(id) {
            const product = savedProducts.find(p => String(p.id) === String(id));
            if (!product) {
                alert('Product not found.');
                return;
            }

            currentProductId = String(product.id);
            updateSupplierOptions();
            document.getElementById('productModalName').value = product.name || '';
            document.getElementById('productModalDescription').value = product.description || '';
            document.getElementById('productModalPrice').value = Number(product.price || 0);
            document.getElementById('productModalTax').value = Number(product.tax || 0);
            document.getElementById('productModalSupplier').value = String(product.supplierId || '');
            document.getElementById('productModalCost').value = Number(product.cost || 0);
            document.getElementById('productModalVatIncluded').checked = Boolean(product.vatIncluded);
            document.getElementById('productModalDontUpdateQty').checked = Boolean(product.dontUpdateQty);

            const modalTitle = document.getElementById('productModalTitle');
            if (modalTitle) modalTitle.textContent = 'Edit Product / Service';
            const saveButton = document.getElementById('productModalSubmitBtn');
            if (saveButton) saveButton.textContent = 'Update Product';

            document.getElementById('productModal').style.display = 'flex';
        }

        function closeProductModal() {
            document.getElementById('productModal').style.display = 'none';
        }

        document.getElementById('productForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const supplierId = document.getElementById('productModalSupplier').value;
            const supplier = suppliers.find(s => String(s.id) === String(supplierId));

            const productData = {
                id: currentProductId || generateProductCode(),
                name: document.getElementById('productModalName').value.trim(),
                description: document.getElementById('productModalDescription').value.trim(),
                price: parseFloat(document.getElementById('productModalPrice').value) || 0,
                tax: parseFloat(document.getElementById('productModalTax').value) || 0,
                supplierId: supplierId || '',
                supplierName: supplier?.name || '',
                cost: parseFloat(document.getElementById('productModalCost').value) || 0,
                vatIncluded: document.getElementById('productModalVatIncluded').checked,
                dontUpdateQty: document.getElementById('productModalDontUpdateQty').checked
            };

            if (!productData.name) {
                alert('Product name is required.');
                return;
            }

            if (isApiEnabled()) {
                try {
                    const apiAction = currentProductId ? 'updateProduct' : 'addProduct';
                    await window.APIClient.postData(apiAction, {
                        product: {
                            id: productData.id,
                            name: productData.name,
                            description: productData.description,
                            price: productData.price,
                            vat: productData.tax,
                            supplier_id: productData.supplierId,
                            supplier_name: productData.supplierName,
                            cost: productData.cost,
                            vat_included: String(productData.vatIncluded),
                            dont_update_qty: String(productData.dontUpdateQty)
                        }
                    });
                    await syncProductsFromApi();
                } catch (error) {
                    console.error('Product API save failed:', error);
                    return;
                }
            } else {
                if (currentProductId) {
                    const index = savedProducts.findIndex(p => String(p.id) === String(currentProductId));
                    if (index !== -1) {
                        savedProducts[index] = productData;
                    }
                } else {
                    savedProducts.push(productData);
                }
                localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
            }

            updateSavedProductsDatalist();
            closeProductModal();
            currentProductId = null;
            renderProducts();
            refreshSupplierCardsIfVisible();
        });

        function updateSavedProductsDatalist() {
            // Update Products View datalist
            const productsDatalist = document.getElementById('productsDatalist');
            if (productsDatalist) {
                productsDatalist.innerHTML = savedProducts.map(product => `<option value="${escapeHtml(product.name)}"></option>`).join('');
            }
            // Update Invoice Form datalist
            const invoiceDatalist = document.getElementById('invoiceProductsDatalist');
            if (invoiceDatalist) {
                invoiceDatalist.innerHTML = savedProducts.map(product => `<option value="${escapeHtml(product.name)}"></option>`).join('');
            }
        }

        function addItemInput(data = {}) {
            try {
                const container = document.getElementById('invoiceItemsTableBody');
                if (!container) {
                    console.error('addItemInput: invoiceItemsTableBody element not found');
                    return;
                }
                
                const rowId = itemCounter++;
                const row = document.createElement('tr');
                row.id = `item-row-${rowId}`;
                row.className = 'hover:bg-slate-50';
                row.innerHTML = `
                    <td class="px-4 py-3">
                        <input list="invoiceProductsDatalist" class="product-name w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" placeholder="Item / Service name" value="${escapeHtml(data.name || '')}">
                    </td>
                    <td class="px-4 py-3">
                        <input type="text" class="product-description w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" placeholder="Optional description" value="${escapeHtml(data.description || '')}">
                    </td>
                    <td class="px-4 py-3 w-28">
                        <input type="number" min="0" step="1" class="product-quantity w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" value="${data.quantity || 1}">
                    </td>
                    <td class="px-4 py-3 w-32">
                        <input type="number" min="0" step="0.01" class="product-price w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" value="${data.price || 0}">
                    </td>
                    <td class="px-4 py-3 w-32 text-right font-semibold text-slate-900 product-total">${formatCurrency(convertCurrency(0))}</td>
                    <td class="px-4 py-3 w-24 text-center">
                        <button type="button" onclick="removeItemInput(${rowId})" class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 hover:bg-rose-200" title="Delete Item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                // Carry vatIncluded and productTax from saved data
                row.dataset.vatIncluded = data.vatIncluded ? 'true' : 'false';
                row.dataset.productTax = data.tax || 0;
                container.appendChild(row);
                
                // Attach event listeners to inputs
                const inputs = row.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.addEventListener('input', () => {
                        if (input.classList.contains('product-name')) {
                            fillProductData(row, input.value);
                        }
                        updateProductRow(row);
                    });
                    input.addEventListener('change', () => {
                        updateProductRow(row);
                    });
                });
                
                // Calculate initial totals
                updateProductRow(row);
                console.log(`Item row ${rowId} created successfully`);
            } catch (error) {
                console.error('Error in addItemInput:', error);
                alert('Error: Could not add item to invoice. Please try again.');
            }
        }

        function fillProductData(row, name) {
            const product = savedProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
            if (!product) return;
            row.querySelector('.product-description').value = product.description || '';
            row.querySelector('.product-price').value = product.price || 0;
            row.dataset.vatIncluded = product.vatIncluded ? 'true' : 'false';
            row.dataset.productTax = product.tax || 0;
        }

        function validateNumber(value) {
            const number = parseFloat(value);
            return Number.isFinite(number) && number >= 0 ? number : 0;
        }

        function getInvoiceRateOptions() {
            return {
                discountRate: validateNumber(document.getElementById('discountInput')?.value),
                vatRate: validateNumber(document.getElementById('vatRateInput')?.value)
            };
        }

        function calculateLineAmounts(item, options = {}) {
            const quantity = validateNumber(item.quantity);
            const rawPrice = validateNumber(item.price);
            const vatIncluded = Boolean(item.vatIncluded);

            const useInvoiceDiscount = Object.prototype.hasOwnProperty.call(options, 'discountRate');
            // If item price is VAT-inclusive, always use the item's own tax rate (not the invoice-level override)
            const useInvoiceVat = !vatIncluded && Object.prototype.hasOwnProperty.call(options, 'vatRate');

            const discount = useInvoiceDiscount ? validateNumber(options.discountRate) : validateNumber(item.discount);
            const tax = useInvoiceVat ? validateNumber(options.vatRate) : validateNumber(item.tax);
            const discountType = useInvoiceDiscount ? '%' : (item.discountType || '%');

            // Back-calculate net price when VAT is already baked into the price
            const netPrice = (vatIncluded && tax > 0) ? rawPrice / (1 + tax / 100) : rawPrice;

            const subtotal = quantity * netPrice;
            const discountAmount = discountType === 'SAR'
                ? Math.min(discount, subtotal)
                : subtotal * discount / 100;
            const taxable = Math.max(0, subtotal - discountAmount);
            const vatAmount = taxable * tax / 100;
            const total = taxable + vatAmount;
            return { quantity, price: rawPrice, subtotal, discountAmount, vatAmount, total, tax, discount, discountType, vatIncluded };
        }

        function updateProductRow(row) {
            const vatIncluded = row.dataset.vatIncluded === 'true';
            const productTax = validateNumber(row.dataset.productTax);
            const item = {
                name: row.querySelector('.product-name')?.value || '',
                description: row.querySelector('.product-description')?.value || '',
                quantity: row.querySelector('.product-quantity')?.value || 0,
                price: row.querySelector('.product-price')?.value || 0,
                vatIncluded: vatIncluded,
                tax: vatIncluded ? productTax : undefined
            };
            const amounts = calculateLineAmounts(item, getInvoiceRateOptions());
            const totalCell = row.querySelector('.product-total');
            if (totalCell) {
                totalCell.innerHTML = formatCurrency(convertCurrency(amounts.total));
            }
            updateTotals();
        }

        function removeItemInput(id) {
            const row = document.getElementById(`item-row-${id}`);
            if (row) row.remove();
            updateTotals();
        }

        function getItemsFromInputs() {
            const items = [];
            const rateOptions = getInvoiceRateOptions();
            document.querySelectorAll('#invoiceItemsTableBody tr').forEach(row => {
                const name = row.querySelector('.product-name')?.value;
                if (name && name.trim()) {
                    const vatIncluded = row.dataset.vatIncluded === 'true';
                    const productTax = validateNumber(row.dataset.productTax);
                    const item = {
                        name: name,
                        description: row.querySelector('.product-description')?.value || '',
                        quantity: validateNumber(row.querySelector('.product-quantity')?.value),
                        price: validateNumber(row.querySelector('.product-price')?.value),
                        vatIncluded: vatIncluded,
                        tax: vatIncluded ? productTax : undefined
                    };
                    const totals = calculateLineAmounts(item, rateOptions);
                    item.discountAmount = totals.discountAmount;
                    item.vatAmount = totals.vatAmount;
                    item.total = totals.total;
                    items.push(item);
                }
            });
            return items;
        }

        function addQuotationItemInput() {
            const container = document.getElementById('quotationItemsInputContainer');
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-row quotation-item-row';
            itemDiv.style.display = 'grid';
            itemDiv.style.gridTemplateColumns = '2fr 1fr 1fr 1fr auto';
            itemDiv.style.gap = '10px';
            itemDiv.style.marginBottom = '10px';
            itemDiv.id = `quotation-item-row-${quotationItemCounter}`;
            itemDiv.innerHTML = `
                <input type="text" placeholder="Item Name" class="item-name" oninput="updateQuotationTotals()">
                <input type="number" placeholder="Qty" class="item-qty" value="1" step="0.01" oninput="updateQuotationTotals()">
                <input type="number" placeholder="Price" class="item-price" value="0" step="0.01" oninput="updateQuotationTotals()">
                <input type="number" placeholder="Discount %" class="item-discount" value="0" step="0.1" oninput="updateQuotationTotals()">
                <button onclick="removeQuotationItemInput(${quotationItemCounter})" class="btn-icon"><i class="fas fa-trash"></i></button>
            `;
            container.appendChild(itemDiv);
            quotationItemCounter++;
        }

        function removeQuotationItemInput(id) {
            const row = document.getElementById(`quotation-item-row-${id}`);
            if (row) row.remove();
            updateQuotationTotals();
        }

        function getQuotationItemsFromInputs() {
            const items = [];
            document.querySelectorAll('.quotation-item-row').forEach(row => {
                const name = row.querySelector('.item-name')?.value;
                if (name && name.trim()) {
                    items.push({
                        name: name,
                        quantity: parseFloat(row.querySelector('.item-qty')?.value) || 0,
                        price: parseFloat(row.querySelector('.item-price')?.value) || 0,
                        discount: parseFloat(row.querySelector('.item-discount')?.value) || 0
                    });
                }
            });
            return items;
        }

        function updateQuotationTotals() {
            const items = getQuotationItemsFromInputs();
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price * (1 - item.discount / 100)), 0);
            window.currentQuotationSubtotal = subtotal;
            window.currentQuotationTotal = subtotal;
            updateQuotationPreview();
        }

        function updateTotals() {
            const items = getItemsFromInputs();
            const rateOptions = getInvoiceRateOptions();
            const rows = Array.from(document.querySelectorAll('#invoiceItemsTableBody tr'));
            let subtotal = 0;
            let discountTotal = 0;
            let vatTotal = 0;
            let grandTotal = 0;

            items.forEach((item, index) => {
                const amounts = calculateLineAmounts(item, rateOptions);
                const totalCell = rows[index]?.querySelector('.product-total');
                if (totalCell) {
                    totalCell.innerHTML = formatCurrency(convertCurrency(amounts.total));
                }
                subtotal += amounts.subtotal;
                discountTotal += amounts.discountAmount;
                vatTotal += amounts.vatAmount;
                grandTotal += amounts.total;
            });

            const shipping = parseFloat(document.getElementById('shippingInput')?.value) || 0;
            const advancePayment = parseFloat(document.getElementById('advancePaymentInput')?.value) || 0;
            const totalWithShipping = grandTotal + shipping;
            const amountDue = totalWithShipping - advancePayment;

            document.getElementById('productSubtotal').innerHTML = formatCurrency(convertCurrency(subtotal));
            document.getElementById('productDiscountTotal').innerHTML = formatCurrency(convertCurrency(discountTotal));
            document.getElementById('productVatTotal').innerHTML = formatCurrency(convertCurrency(vatTotal));
            document.getElementById('productGrandTotal').innerHTML = formatCurrency(convertCurrency(totalWithShipping));

            window.currentSubtotal = subtotal;
            window.currentVatTotal = vatTotal;
            window.currentDiscountTotal = discountTotal;
            window.currentTotal = totalWithShipping;
            window.currentAmountDue = amountDue;
            updatePreview();
        }

        function updatePreview() {
            const items = getItemsFromInputs();
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const timestamp = window.currentInvoiceTimestamp || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
            window.currentInvoiceTimestamp = timestamp;
            const customerSnapshot = getInvoiceCustomerSnapshot();
            const invoiceData = {
                invoiceNo: document.getElementById('invoiceNoDisplay')?.value,
                date: document.getElementById('invoiceDate')?.value || new Date().toISOString().split('T')[0],
                dueDate: document.getElementById('dueDate')?.value,
                customerId: customerSnapshot.customerId,
                customerName: customerSnapshot.customerName,
                customerPhone: customerSnapshot.customerPhone,
                customerEmail: customerSnapshot.customerEmail,
                customerCompany: customerSnapshot.customerCompany,
                customerVatNumber: customerSnapshot.customerVatNumber,
                customerAddress: customerSnapshot.customerAddress,
                sellerName: settings.companyName || '',
                vatNumber: settings.companyVatNumber || '',
                timestamp: timestamp,
                items: items,
                subtotal: window.currentSubtotal || 0,
                discount: validateNumber(document.getElementById('discountInput')?.value),
                discountTotal: window.currentDiscountTotal || 0,
                vatRate: validateNumber(document.getElementById('vatRateInput')?.value),
                vatTotal: window.currentVatTotal || 0,
                shipping: parseFloat(document.getElementById('shippingInput')?.value) || 0,
                advancePayment: parseFloat(document.getElementById('advancePaymentInput')?.value) || 0,
                total: window.currentTotal || 0,
                amountDue: window.currentAmountDue || 0
            };
            
            const previewHtml = generateInvoiceHTML(invoiceData);
            document.getElementById('invoicePreview').innerHTML = previewHtml;
            renderInvoiceQRCode(invoiceData);
        }

        function generateInvoiceHTML(data) {
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const showInvoiceQr = shouldShowInvoiceQr(data);
            const qrStatusLabel = 'QR: Enabled';
            const qrStatusBg = '#ecfdf5';
            const qrStatusColor = '#166534';
            const customerVatNumber = String(data.customerVatNumber || '').trim();
            const normalizedCompanyAddress = (settings.companyAddress || '')
                .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
                .replace(/^(<br\s*\/?>\s*)+|(<br\s*\/?>\s*)+$/gi, '');
            const hasLegacyLineRates = (data.items || []).some(item => item.discount != null || item.tax != null || item.discountType);
            const calculationOptions = hasLegacyLineRates
                ? {}
                : {
                    discountRate: validateNumber(data.discount),
                    vatRate: validateNumber(data.vatRate)
                };
            const itemTotals = (data.items || []).map(item => calculateLineAmounts(item, calculationOptions));
            const subtotal = itemTotals.reduce((sum, item) => sum + item.subtotal, 0);
            const discountTotal = itemTotals.reduce((sum, item) => sum + item.discountAmount, 0);
            const vatTotal = itemTotals.reduce((sum, item) => sum + item.vatAmount, 0);
            const itemsTotal = itemTotals.reduce((sum, item) => sum + item.total, 0);
            const grossTotal = itemsTotal + (data.shipping || 0);
            const totalAmount = grossTotal - (data.advancePayment || 0);
            const invoiceDiscountRate = validateNumber(data.discount);
            const invoiceVatRate = validateNumber(data.vatRate);
            const formatRate = value => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
            
            // Convert amount to words
            function amountToWords(num) {
                const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
                const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
                const scales = ['', 'thousand', 'million', 'billion'];
                
                if (num === 0) return 'zero';
                let words = '';
                let scaleIndex = 0;
                
                while (num > 0) {
                    if (num % 1000 !== 0) {
                        words = convertHundreds(num % 1000) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + ' ' + words;
                    }
                    num = Math.floor(num / 1000);
                    scaleIndex++;
                }
                
                function convertHundreds(num) {
                    let result = '';
                    if (Math.floor(num / 100) > 0) {
                        result += ones[Math.floor(num / 100)] + ' hundred ';
                    }
                    num %= 100;
                    if (num >= 20) {
                        result += tens[Math.floor(num / 10)];
                        if (num % 10 > 0) result += ' ' + ones[num % 10];
                    } else if (num >= 10) {
                        result += teens[num - 10];
                    } else if (num > 0) {
                        result += ones[num];
                    }
                    return result.trim();
                }
                
                return words.trim();
            }
            
            const itemRows = (data.items || []).map(item => {
                const amounts = calculateLineAmounts(item, calculationOptions);
                return `
                    <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                            ${escapeHtml(item.name || '')}
                            ${item.description ? `<div style="margin-top: 4px; font-size: 11px; font-weight: 400; color: #6b7280;">${escapeHtml(item.description)}</div>` : ''}
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                            ${amounts.quantity}
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${formatCurrency(convertCurrency(amounts.price))}
                            ${item.vatIncluded ? `<div style="margin-top:3px;"><span style="display:inline-block;background:#ecfdf5;color:#166534;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;">VAT INCL.</span></div>` : ''}
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${formatCurrency(convertCurrency(amounts.total))}
                        </td>
                    </tr>
                `;
            }).join('');
            
            return `
                <div style="background: white; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; line-height: 1.4;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                        <div style="flex: 1;">
                            ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height: 70px; margin-bottom: 15px;">` : ''}
                            <div style="font-size: 11px; color: #666; line-height: 1.6;">
                                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a1a;">${escapeHtml(settings.companyName || 'Your Company')}</h3>
                                ${normalizedCompanyAddress || '123 Business Street, City, Country'}
                                ${(normalizedCompanyAddress && (settings.companyMobile || settings.companyEmail || settings.companyWebsite)) ? '<br>' : ''}
                                ${settings.companyMobile ? `<i class="fas fa-phone"></i> ${escapeHtml(settings.companyMobile)}<br>` : ''}
                                ${settings.companyEmail ? `<i class="fas fa-envelope"></i> ${escapeHtml(settings.companyEmail)}<br>` : ''}
                                ${settings.companyWebsite ? `<i class="fas fa-globe"></i> ${escapeHtml(settings.companyWebsite)}` : ''}
                            </div>
                        </div>
                        <div style="text-align: right; flex: 1;">
                            <h1 style="font-size: 32px; margin: 0 0 15px 0; color: #1a1a1a; font-weight: bold;">TAX INVOICE</h1>
                            <table style="width: 100%; font-size: 12px; text-align: right;">
                                <tr><td style="font-weight: bold; padding: 3px 0;">Invoice No:</td><td style="padding: 3px 0;">${escapeHtml(data.invoiceNo || '')}</td></tr>
                                <tr><td style="font-weight: bold; padding: 3px 0;">Date:</td><td style="padding: 3px 0;">${escapeHtml(data.date || '')}</td></tr>
                                <tr><td style="font-weight: bold; padding: 3px 0;">Due Date:</td><td style="padding: 3px 0;">${escapeHtml(data.dueDate || '')}</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Bill To -->
                    <div style="margin-bottom: 25px;">
                        <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px;">Bill To:</div>
                        <div style="font-size: 13px; line-height: 1.6;">
                            <div style="font-weight: bold; margin-bottom: 4px;">${escapeHtml(data.customerName || '')}</div>
                            ${customerVatNumber ? `<div><strong>VAT / TAX No:</strong> ${escapeHtml(customerVatNumber)}</div>` : ''}
                            <div>${escapeHtml(data.customerAddress || '')}</div>
                            <div>${escapeHtml(data.customerPhone || '')}${data.customerPhone && data.customerEmail ? ' | ' : ''}${escapeHtml(data.customerEmail || '')}</div>
                        </div>
                    </div>
                    
                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
                        <thead>
                            <tr style="background: #f3f4f6; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db;">
                                <th style="padding: 10px 15px; text-align: left; font-weight: bold;">Item / Service Name</th>
                                <th style="padding: 10px 15px; text-align: center; font-weight: bold;">Quantity</th>
                                <th style="padding: 10px 15px; text-align: right; font-weight: bold;">Price</th>
                                <th style="padding: 10px 15px; text-align: right; font-weight: bold;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows || `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">No items added</td></tr>`}
                        </tbody>
                    </table>
                    
                    <!-- Footer with QR and Totals -->
                    <div style="display: flex; gap: ${showInvoiceQr ? '30px' : '0'}; margin-bottom: 30px;">
                        ${showInvoiceQr
                            ? `<div style="flex: 0 0 auto; min-width: 160px;">
                                <div style="display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:600; margin-bottom:10px; background:${qrStatusBg}; color:${qrStatusColor};">${qrStatusLabel}</div>
                                <div id="invoiceQrCode" style="width: 160px; height: 160px;"></div>
                              </div>`
                            : ''}
                        
                        <!-- Right Column: Totals and Amount in Words -->
                        <div style="flex: 1;">
                            <!-- Totals Section -->
                            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                                <table style="width: 280px; font-size: 12px; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 6px 15px; text-align: left;">Subtotal:</td>
                                        <td style="padding: 6px 15px; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatCurrency(convertCurrency(subtotal))}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 15px; text-align: left;">Discount (${formatRate(invoiceDiscountRate)}%):</td>
                                        <td style="padding: 6px 15px; text-align: right; border-bottom: 1px solid #e5e7eb;">-${formatCurrency(convertCurrency(discountTotal))}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 15px; text-align: left;">VAT (${formatRate(invoiceVatRate)}%):</td>
                                        <td style="padding: 6px 15px; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatCurrency(convertCurrency(vatTotal))}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 15px; text-align: left;">Shipping:</td>
                                        <td style="padding: 6px 15px; text-align: right; border-bottom: 2px solid #333;">${formatCurrency(convertCurrency(data.shipping || 0))}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 15px; text-align: left;">Advance Payment:</td>
                                        <td style="padding: 6px 15px; text-align: right; border-bottom: 1px solid #e5e7eb;">-${formatCurrency(convertCurrency(data.advancePayment || 0))}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 15px; text-align: left; font-weight: bold; font-size: 13px;">Amount Due:</td>
                                        <td style="padding: 10px 15px; text-align: right; font-weight: bold; font-size: 13px;">${formatCurrency(convertCurrency(totalAmount))}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Amount in Words -->
                            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px;">
                                <strong>In Word:</strong> ${amountToWords(Math.floor(totalAmount))} ${Math.floor(totalAmount) === totalAmount ? '' : 'and ' + Math.round((totalAmount % 1) * 100) + ' fils'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px;">
                        Thank you for your business!
                    </div>
                </div>
            `;
        }

        function toUtf8Bytes(value) {
            const normalized = String(value || '');
            if (typeof TextEncoder !== 'undefined') {
                return Array.from(new TextEncoder().encode(normalized));
            }
            return Array.from(unescape(encodeURIComponent(normalized))).map(ch => ch.charCodeAt(0));
        }

        function isVatTaxEnabled() {
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            if (typeof settings.vatTaxEnabled === 'undefined') {
                return true;
            }
            return Boolean(settings.vatTaxEnabled);
        }

        function setVatTaxEnabled(enabled) {
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            settings.vatTaxEnabled = Boolean(enabled);
            localStorage.setItem('pro_invoice_settings', JSON.stringify(settings));

            const invoiceListVisible = document.getElementById('invoiceListView')?.style.display === 'block';
            const invoiceFormVisible = document.getElementById('invoiceFormView')?.style.display === 'block';

            if (invoiceListVisible) {
                renderInvoiceTable();
            }
            if (invoiceFormVisible) {
                updatePreview();
            }
        }

        function toggleVatTaxQrSetting() {
            const nextState = !isVatTaxEnabled();
            setVatTaxEnabled(nextState);
            alert(nextState ? 'VAT/Tax QR enabled for invoices.' : 'VAT/Tax QR disabled for invoices.');
        }

        function normalizeVatNumber(value) {
            return String(value || '').replace(/\s+/g, '');
        }

        function hasValidCustomerVatNumber(value) {
            return /^\d{15}$/.test(normalizeVatNumber(value));
        }

        function hasPositiveInvoiceVat(data = {}) {
            const vatTotal = Number(data.vatTotal);
            if (Number.isFinite(vatTotal) && vatTotal > 0) {
                return true;
            }

            const items = Array.isArray(data.items) ? data.items : [];
            if (items.length === 0) {
                return false;
            }

            const invoiceVatRate = validateNumber(data.vatRate);
            if (invoiceVatRate > 0) {
                return items.some(item => validateNumber(item.quantity) > 0 && validateNumber(item.price) > 0);
            }

            return items.some(item =>
                validateNumber(item.tax) > 0 &&
                validateNumber(item.quantity) > 0 &&
                validateNumber(item.price) > 0
            );
        }

        function getInvoiceQrBlockReason(data = {}) {
            if (!isVatTaxEnabled()) {
                return 'VAT/Tax is disabled in Settings. QR code will not be shown or printed on this invoice.';
            }

            if (!hasValidCustomerVatNumber(data.customerVatNumber)) {
                return 'Customer VAT number is required (15 digits) to generate QR code.';
            }

            if (!hasPositiveInvoiceVat(data)) {
                return 'Invoice VAT is 0.00, so QR code will stay hidden.';
            }

            return '';
        }

        function shouldShowInvoiceQr(data = {}) {
            return getInvoiceQrBlockReason(data) === '';
        }

        function encodeZatcaTlvField(tag, value) {
            const utf8Bytes = toUtf8Bytes(value);
            const safeBytes = utf8Bytes.length > 255 ? utf8Bytes.slice(0, 255) : utf8Bytes;
            return [tag, safeBytes.length, ...safeBytes];
        }

        function buildInvoiceQrPayload(data) {
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const timestamp = data.timestamp || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

            const sellerName = String(data.sellerName || settings.companyName || '').trim();
            const vatNumber = String(data.vatNumber || settings.companyVatNumber || '').trim();
            const invoiceTotal = Number(data.total || 0).toFixed(2);
            const vatAmount = Number(data.vatTotal || 0).toFixed(2);

            // Optional Phase-2 fields (if available from a compliant signing backend).
            const invoiceHash = String(data.invoiceHash || settings.zatcaInvoiceHash || '').trim();
            const ecdsaSignature = String(data.ecdsaSignature || settings.zatcaEcdsaSignature || '').trim();
            const ecdsaPublicKey = String(data.ecdsaPublicKey || settings.zatcaEcdsaPublicKey || '').trim();
            const certificateSignature = String(data.certificateSignature || settings.zatcaCertificateSignature || '').trim();

            const tlvBytes = [];
            tlvBytes.push(...encodeZatcaTlvField(1, sellerName));
            tlvBytes.push(...encodeZatcaTlvField(2, vatNumber));
            tlvBytes.push(...encodeZatcaTlvField(3, timestamp));
            tlvBytes.push(...encodeZatcaTlvField(4, invoiceTotal));
            tlvBytes.push(...encodeZatcaTlvField(5, vatAmount));

            if (invoiceHash) tlvBytes.push(...encodeZatcaTlvField(6, invoiceHash));
            if (ecdsaSignature) tlvBytes.push(...encodeZatcaTlvField(7, ecdsaSignature));
            if (ecdsaPublicKey) tlvBytes.push(...encodeZatcaTlvField(8, ecdsaPublicKey));
            if (certificateSignature) tlvBytes.push(...encodeZatcaTlvField(9, certificateSignature));

            const binaryString = String.fromCharCode(...tlvBytes);
            return btoa(binaryString);
        }

        function getInvoiceQrDataUrl(data) {
            if (typeof QRCode !== 'function') return '';
            const tempContainer = document.createElement('div');
            new QRCode(tempContainer, {
                text: buildInvoiceQrPayload(data),
                width: 180,
                height: 180,
                colorDark: '#000000',
                colorLight: '#ffffff'
            });
            const canvas = tempContainer.querySelector('canvas');
            const image = tempContainer.querySelector('img');
            return canvas?.toDataURL('image/png') || image?.src || '';
        }

        function renderInvoiceQRCode(data) {
            const qrContainer = document.getElementById('invoiceQrCode');
            if (!qrContainer) return;
            if (!shouldShowInvoiceQr(data)) {
                qrContainer.innerHTML = '';
                return;
            }
            const qrDataUrl = getInvoiceQrDataUrl(data);
            qrContainer.innerHTML = qrDataUrl
                ? `<img src="${qrDataUrl}" alt="Invoice QR Code">`
                : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:12px;color:#64748b;text-align:center;">QR code unavailable</div>';
        }

        function updateQuotationPreview() {
            const items = getQuotationItemsFromInputs();
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price * (1 - item.discount / 100)), 0);
            const customerName = document.getElementById('quotationCustomerSelect')?.value || '';
            const selectedCustomer = customers.find(c => c.name === customerName) || {};
            const quotationData = {
                quotationNo: document.getElementById('quotationNoDisplay')?.value,
                date: document.getElementById('quotationDate')?.value || new Date().toISOString().split('T')[0],
                customerName: customerName,
                customerCompany: selectedCustomer.company || '',
                customerAddress: selectedCustomer.address || '',
                customerPhone: selectedCustomer.phone || '',
                customerEmail: selectedCustomer.email || '',
                items: items,
                subtotal: subtotal,
                total: subtotal
            };
            
            const previewHtml = generateQuotationHTML(quotationData);
            document.getElementById('quotationPreview').innerHTML = previewHtml;
        }

        function generateQuotationHTML(data) {
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const normalizedCompanyAddress = (settings.companyAddress || '')
                .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
                .replace(/^(<br\s*\/?>\s*)+|(<br\s*\/?>\s*)+$/gi, '');
            const itemRows = (data.items || []).map(item => {
                const amount = item.quantity * item.price * (1 - item.discount / 100);
                return `
                    <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                            ${escapeHtml(item.name || '')}
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                            ${item.quantity}
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${formatCurrency(convertCurrency(item.price))}
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                            ${item.discount}%
                        </td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${formatCurrency(convertCurrency(amount))}
                        </td>
                    </tr>
                `;
            }).join('');
            
            const subtotal = (data.items || []).reduce((sum, item) => sum + (item.quantity * item.price * (1 - item.discount / 100)), 0);
            
            return `
                <div style="background: white; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; line-height: 1.4;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                        <div style="flex: 1;">
                            ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height: 70px; margin-bottom: 15px;">` : ''}
                            <div style="font-size: 11px; color: #666; line-height: 1.6;">
                                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a1a;">${escapeHtml(settings.companyName || 'Your Company')}</h3>
                                ${normalizedCompanyAddress || '123 Business Street, City, Country'}
                                ${(normalizedCompanyAddress && (settings.companyMobile || settings.companyEmail || settings.companyWebsite)) ? '<br>' : ''}
                                ${settings.companyMobile ? `<i class="fas fa-phone"></i> ${escapeHtml(settings.companyMobile)}<br>` : ''}
                                ${settings.companyEmail ? `<i class="fas fa-envelope"></i> ${escapeHtml(settings.companyEmail)}<br>` : ''}
                                ${settings.companyWebsite ? `<i class="fas fa-globe"></i> ${escapeHtml(settings.companyWebsite)}` : ''}
                            </div>
                        </div>
                        <div style="text-align: right; flex: 1;">
                            <h1 style="font-size: 32px; margin: 0 0 15px 0; color: #1a1a1a; font-weight: bold;">QUOTATION</h1>
                            <table style="width: 100%; font-size: 12px; text-align: right;">
                                <tr><td style="font-weight: bold; padding: 3px 0;">Quote No:</td><td style="padding: 3px 0;">${escapeHtml(data.quotationNo || '')}</td></tr>
                                <tr><td style="font-weight: bold; padding: 3px 0;">Date:</td><td style="padding: 3px 0;">${escapeHtml(data.date || '')}</td></tr>
                                <tr><td style="font-weight: bold; padding: 3px 0;">Valid Until:</td><td style="padding: 3px 0;">30 days</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Bill To -->
                    <div style="margin-bottom: 25px;">
                        <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px;">Quotation For:</div>
                        <div style="font-size: 13px; line-height: 1.6;">
                            <div style="font-weight: bold; margin-bottom: 4px;">${escapeHtml(data.customerName || '')}</div>
                            <div>${escapeHtml(data.customerCompany || '')}</div>
                            <div>${escapeHtml(data.customerAddress || '')}</div>
                            <div>${escapeHtml(data.customerPhone || '')}${data.customerPhone && data.customerEmail ? ' | ' : ''}${escapeHtml(data.customerEmail || '')}</div>
                        </div>
                    </div>
                    
                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
                        <thead>
                            <tr style="background: #f3f4f6; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db;">
                                <th style="padding: 10px 15px; text-align: left; font-weight: bold;">Item / Service</th>
                                <th style="padding: 10px 15px; text-align: center; font-weight: bold;">Quantity</th>
                                <th style="padding: 10px 15px; text-align: right; font-weight: bold;">Unit Price</th>
                                <th style="padding: 10px 15px; text-align: center; font-weight: bold;">Discount</th>
                                <th style="padding: 10px 15px; text-align: right; font-weight: bold;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">No items added</td></tr>`}
                        </tbody>
                    </table>
                    
                    <!-- Totals -->
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
                        <table style="width: 280px; font-size: 12px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 15px; text-align: left;">Subtotal:</td>
                                <td style="padding: 8px 15px; text-align: right; border-bottom: 2px solid #333; font-weight: bold;">${formatCurrency(convertCurrency(subtotal))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 15px; text-align: left; font-weight: bold; font-size: 13px;">Total:</td>
                                <td style="padding: 12px 15px; text-align: right; font-weight: bold; font-size: 13px;">${formatCurrency(convertCurrency(data.total || subtotal))}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Notes -->
                    <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin-bottom: 20px; font-size: 11px; color: #666;">
                        <strong>Notes:</strong><br>
                        This quotation is valid for 30 days from the date specified above. Prices are subject to change without notice. Terms and conditions apply.
                    </div>
                    
                    <!-- Footer -->
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px;">
                        Thank you for your interest! We look forward to your business.
                    </div>
                </div>
            `;
        }

        async function saveInvoice() {
            const customerSnapshot = getInvoiceCustomerSnapshot();
            const customerName = customerSnapshot.customerName;
            if (!customerName) {
                alert('Please enter customer name');
                return;
            }
            
            const items = getItemsFromInputs();
            if (items.length === 0) {
                alert('Please add at least one item');
                return;
            }
            
            let customerId = customerSnapshot.customerId;
            if (!customerId && customerName) {
                const existingCustomer = customers.find(c => c.name === customerName);
                if (existingCustomer) {
                    customerId = existingCustomer.id;
                } else {
                    customerId = Date.now().toString();
                    customers.push({
                        id: customerId,
                        name: customerName,
                        phone: customerSnapshot.customerPhone,
                        email: customerSnapshot.customerEmail,
                        company: customerSnapshot.customerCompany,
                        vatNumber: customerSnapshot.customerVatNumber,
                        address: customerSnapshot.customerAddress,
                        tag: 'New',
                        totalSpent: 0,
                        contactHistory: []
                    });
                }
            }
            
            const invoice = {
                id: Date.now().toString(),
                invoiceNo: document.getElementById('invoiceNoDisplay')?.value,
                customerId: customerId,
                customerName: customerName,
                customerPhone: customerSnapshot.customerPhone,
                customerEmail: customerSnapshot.customerEmail,
                customerCompany: customerSnapshot.customerCompany,
                customerVatNumber: customerSnapshot.customerVatNumber,
                customerAddress: customerSnapshot.customerAddress,
                date: document.getElementById('invoiceDate')?.value || new Date().toISOString().split('T')[0],
                dueDate: document.getElementById('dueDate')?.value,
                items: items,
                subtotal: window.currentSubtotal || 0,
                discount: parseFloat(document.getElementById('discountInput')?.value) || 0,
                vatRate: parseFloat(document.getElementById('vatRateInput')?.value) || 0,
                shipping: parseFloat(document.getElementById('shippingInput')?.value) || 0,
                advancePayment: parseFloat(document.getElementById('advancePaymentInput')?.value) || 0,
                total: window.currentTotal || 0,
                amountDue: window.currentAmountDue || 0,
                timestamp: window.currentInvoiceTimestamp || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
                status: 'Unpaid',
                currency: currentCurrency
            };

            if (isApiEnabled()) {
                try {
                    if (!customers.find(c => c.id === customerId)) {
                        await window.APIClient.postData('addCustomer', {
                            customer: normalizeCustomerToApi({
                                id: customerId,
                                name: customerName,
                                phone: customerSnapshot.customerPhone || '',
                                email: customerSnapshot.customerEmail || '',
                                company: customerSnapshot.customerCompany || '',
                                vatNumber: customerSnapshot.customerVatNumber || '',
                                address: customerSnapshot.customerAddress || '',
                                tag: 'New',
                                notes: ''
                            })
                        });
                    }

                    await window.APIClient.postData('addInvoice', {
                        invoice: {
                            id: invoice.id,
                            invoice_no: invoice.invoiceNo,
                            customer_id: invoice.customerId,
                            customer_name: invoice.customerName,
                            date: invoice.date,
                            due_date: invoice.dueDate,
                            subtotal: invoice.subtotal,
                            total: invoice.total,
                            vat: invoice.vatRate,
                            discount: invoice.discount,
                            shipping: invoice.shipping,
                            advance_payment: invoice.advancePayment,
                            amount_due: invoice.amountDue,
                            currency: invoice.currency,
                            status: invoice.status,
                            items: JSON.stringify(invoice.items || [])
                        }
                    });

                    await window.APIClient.postData('addCustomerTransaction', {
                        transaction: {
                            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            customer_id: customerId,
                            type: 'invoice',
                            amount: Number(invoice.total || 0),
                            date: invoice.date,
                            note: `Invoice ${invoice.invoiceNo}`
                        }
                    });

                    await Promise.all([syncInvoicesFromApi(), syncCustomersFromApi()]);
                    await refreshCustomerFinancials(customerId);
                } catch (error) {
                    console.error('Invoice API save failed:', error);
                    return;
                }
            } else {
                invoices.push(invoice);
                await refreshCustomerFinancials(customerId);
                saveData();
            }

            nextInvoiceNumber++;
            generateInvoiceNumber();
            updateDashboard();
            updateCharts();
            showInvoiceList();
            alert('Invoice saved successfully!');
        }

        function sendInvoiceEmail() {
            const email = document.getElementById('customerEmailInput')?.value;
            if (email) {
                alert(`Invoice details can be sent to ${email}`);
            } else {
                alert('Please add customer email address');
            }
        }

        function sendWhatsApp() {
            const phone = document.getElementById('customerPhoneInput')?.value;
            if (phone) {
                const invoiceNo = document.getElementById('invoiceNoDisplay')?.value;
                const total = formatCurrency(convertCurrency(window.currentTotal || 0));
                const message = `Dear customer,\n\nYour invoice ${invoiceNo} for ${total} is ready.\nThank you for your business!`;
                window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                alert('Please add customer phone number');
            }
        }

        // ==================== INVOICE LIST ====================
        async function showInvoiceList() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('invoiceListView').style.display = 'block';
            setActiveNav('navInvoices');
            if (isApiEnabled()) {
                try { await syncInvoicesFromApi(); } catch (error) { console.error(error); }
            }
            renderInvoiceTable();
        }

        function renderInvoiceTable() {
            const container = document.getElementById('invoiceTableContainer');
            if (!container) return;
            const qrEnabled = isVatTaxEnabled();
            
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${invoices.map(inv => `
                            <tr>
                                <td>${inv.invoiceNo}</td>
                                <td>${inv.customerName}</td>
                                <td>${inv.date}</td>
                                <td>${inv.dueDate || '-'}</td>
                                <td>${formatCurrency(convertCurrency(inv.total, inv.currency))}</td>
                                <td><span class="status ${inv.status}">${inv.status}</span></td>
                                <td style="display:flex;gap:4px;flex-wrap:wrap;">
                                    <button onclick="openInvoiceQrForInvoice('${inv.id}')" class="btn-icon" title="${qrEnabled ? 'Show QR code on invoice' : 'VAT/Tax disabled: QR will stay hidden'}" style="${qrEnabled ? 'color: var(--success);' : 'color: var(--text-secondary);'}"><i class="fas fa-qrcode"></i></button>
                                    <button onclick="editInvoice('${inv.id}')" class="btn-icon" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button onclick="deleteInvoice('${inv.id}')" class="btn-icon" title="Delete"><i class="fas fa-trash"></i></button>
                                    <button onclick="printInvoiceById('${inv.id}')" class="btn-icon" title="Print"><i class="fas fa-print"></i></button>
                                    ${inv.status === 'Paid' ? `<span title='Paid' style='color:var(--success);font-weight:bold;'><i class='fas fa-check-circle'></i></span>` : `<button onclick="markAsPaid('${inv.id}')" class="btn-icon" title="Mark as Paid"><i class="fas fa-check-circle"></i></button>`}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        function openInvoiceQrForInvoice(id) {
            const invoice = invoices.find(i => i.id === id);
            if (!invoice) return;

            const qrBlockReason = getInvoiceQrBlockReason(invoice);
            if (qrBlockReason) {
                alert(qrBlockReason);
                return;
            }
            editInvoice(id);
            updatePreview();
        }

        // Print a specific invoice by id
        function printInvoiceById(id) {
            const invoice = invoices.find(i => i.id === id);
            if (!invoice) return;
            const customerRecord = findCustomerRecord(invoice.customerId, invoice.customerName);
            // Show invoice form view
            createNewInvoice();
            // Set invoice fields
            populateInvoiceCustomerFields({
                customerId: invoice.customerId || customerRecord?.id || '',
                customerName: invoice.customerName || customerRecord?.name || '',
                customerPhone: invoice.customerPhone || customerRecord?.phone || '',
                customerEmail: invoice.customerEmail || customerRecord?.email || '',
                customerCompany: invoice.customerCompany || customerRecord?.company || '',
                customerVatNumber: invoice.customerVatNumber || customerRecord?.vatNumber || '',
                customerAddress: invoice.customerAddress || customerRecord?.address || ''
            });
            document.getElementById('invoiceDate').value = invoice.date || '';
            document.getElementById('dueDate').value = invoice.dueDate || '';
            document.getElementById('discountInput').value = invoice.discount || 0;
            document.getElementById('vatRateInput').value = invoice.vatRate || 0;
            document.getElementById('shippingInput').value = invoice.shipping || 0;
            document.getElementById('advancePaymentInput').value = invoice.advancePayment || 0;
            window.currentInvoiceTimestamp = invoice.timestamp || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
            // Restore items
            const itemsContainer = document.getElementById('invoiceItemsTableBody');
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
            }
            if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach(item => addItemInput(item));
            } else {
                addItemInput();
            }
            updateTotals();
            // Wait for DOM update, then print
            setTimeout(() => {
                updatePreview();
                printInvoice();
            }, 350);
        }

        function filterInvoices() {
            const term = document.getElementById('invoiceSearchInput')?.value.toLowerCase();
            if (!term) return renderInvoiceTable();
            const filtered = invoices.filter(inv =>
                String(inv.id || '').toLowerCase().includes(term) ||
                String(inv.invoiceNo || '').toLowerCase().includes(term) ||
                String(inv.customerName || '').toLowerCase().includes(term) ||
                String(inv.status || '').toLowerCase().includes(term) ||
                String(inv.date || '').toLowerCase().includes(term)
            );
            const container = document.getElementById('invoiceTableContainer');
            const qrEnabled = isVatTaxEnabled();
            if (container) {
                container.innerHTML = `<table class="data-table"><thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                    ${filtered.map(inv => `<tr><td>${inv.invoiceNo}</td><td>${inv.customerName}</td><td>${inv.date}</td><td>${formatCurrency(convertCurrency(inv.total))}</td><td>${inv.status}</td><td style="display:flex;gap:4px;flex-wrap:wrap;"><button onclick="openInvoiceQrForInvoice('${inv.id}')" class="btn-icon" title="${qrEnabled ? 'Show QR code on invoice' : 'VAT/Tax disabled: QR will stay hidden'}" style="${qrEnabled ? 'color: var(--success);' : 'color: var(--text-secondary);'}"><i class="fas fa-qrcode"></i></button><button onclick="editInvoice('${inv.id}')" class="btn-icon" title="Edit"><i class="fas fa-edit"></i></button></td></tr>`).join('')}
                </tbody></table>`;
            }
        }

        function editInvoice(id) {
            const invoice = invoices.find(i => i.id === id);
            if (invoice) {
                const customerRecord = findCustomerRecord(invoice.customerId, invoice.customerName);
                createNewInvoice();
                populateInvoiceCustomerFields({
                    customerId: invoice.customerId || customerRecord?.id || '',
                    customerName: invoice.customerName || customerRecord?.name || '',
                    customerPhone: invoice.customerPhone || customerRecord?.phone || '',
                    customerEmail: invoice.customerEmail || customerRecord?.email || '',
                    customerCompany: invoice.customerCompany || customerRecord?.company || '',
                    customerVatNumber: invoice.customerVatNumber || customerRecord?.vatNumber || '',
                    customerAddress: invoice.customerAddress || customerRecord?.address || ''
                });
                document.getElementById('invoiceDate').value = invoice.date;
                document.getElementById('dueDate').value = invoice.dueDate || '';
                document.getElementById('discountInput').value = invoice.discount;
                document.getElementById('vatRateInput').value = invoice.vatRate;
                document.getElementById('shippingInput').value = invoice.shipping;
                document.getElementById('advancePaymentInput').value = invoice.advancePayment || 0;
                window.currentInvoiceTimestamp = invoice.timestamp || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
                const itemsContainer = document.getElementById('invoiceItemsTableBody');
                if (itemsContainer) {
                    itemsContainer.innerHTML = '';
                }
                if (invoice.items && invoice.items.length > 0) {
                    invoice.items.forEach(item => addItemInput(item));
                } else {
                    addItemInput();
                }
                updateTotals();
            }
        }

        async function deleteInvoice(id) {
            if (confirm('Delete this invoice?')) {
                if (isApiEnabled()) {
                    try {
                        await window.APIClient.postData('deleteInvoice', { id: id });
                        await syncInvoicesFromApi();
                    } catch (error) {
                        console.error('Invoice API delete failed:', error);
                        return;
                    }
                } else {
                    invoices = invoices.filter(i => i.id !== id);
                    saveData();
                }
                renderInvoiceTable();
                updateDashboard();
            }
        }

        async function markAsPaid(id) {
            const invoice = invoices.find(i => i.id === id);
            if (invoice) {
                invoice.status = 'Paid';
                if (isApiEnabled()) {
                    try {
                        await window.APIClient.postData('updateInvoice', {
                            invoice: {
                                id: invoice.id,
                                invoice_no: invoice.invoiceNo,
                                customer_id: invoice.customerId,
                                customer_name: invoice.customerName,
                                date: invoice.date,
                                due_date: invoice.dueDate,
                                subtotal: invoice.subtotal,
                                total: invoice.total,
                                vat: invoice.vatRate,
                                discount: invoice.discount,
                                shipping: invoice.shipping,
                                advance_payment: invoice.advancePayment,
                                amount_due: invoice.amountDue,
                                currency: invoice.currency,
                                status: invoice.status,
                                items: JSON.stringify(invoice.items || [])
                            }
                        });
                        await window.APIClient.postData('addCustomerTransaction', {
                            transaction: {
                                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                customer_id: invoice.customerId,
                                type: 'payment',
                                amount: Number(invoice.total || 0),
                                date: new Date().toISOString().split('T')[0],
                                note: `Payment for invoice ${invoice.invoiceNo}`
                            }
                        });
                        await syncInvoicesFromApi();
                        await refreshCustomerFinancials(invoice.customerId);
                    } catch (error) {
                        console.error('Invoice API update failed:', error);
                        return;
                    }
                } else {
                    await refreshCustomerFinancials(invoice.customerId);
                    saveData();
                }
                renderInvoiceTable();
                updateDashboard();
            }
        }

        // ==================== QUOTATIONS ====================
        async function showQuotations() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('quotationsView').style.display = 'block';
            setActiveNav('navQuotations');
            if (isApiEnabled()) {
                try {
                    await syncQuotationsFromApi();
                } catch (error) {
                    console.error('Failed to sync quotations from API.', error);
                }
            }
            document.getElementById('quotationSearchInput')?.focus();
            renderQuotations();
        }

        function renderQuotations() {
            const container = document.getElementById('quotationsList');
            if (!container) return;
            const searchTerm = document.getElementById('quotationSearchInput')?.value.toLowerCase() || '';
            const filtered = quotations.filter(q => {
                const itemText = (q.items || [])
                    .map(item => `${item.name || ''} ${item.description || ''}`)
                    .join(' ')
                    .toLowerCase();
                const status = (q.status || 'Uninvoiced').toLowerCase();
                return String(q.id || '').toLowerCase().includes(searchTerm)
                    || q.quotationNo.toLowerCase().includes(searchTerm)
                    || q.customerName.toLowerCase().includes(searchTerm)
                    || itemText.includes(searchTerm)
                    || (q.date || '').toLowerCase().includes(searchTerm)
                    || status.includes(searchTerm);
            });
            if (filtered.length === 0) {
                container.innerHTML = `<div class="text-sm text-slate-600">No quotations found for "${escapeHtml(searchTerm)}".</div>`;
                return;
            }
            container.innerHTML = `
                <div class="quotation-table-wrap">
                    <table class="quotation-table">
                        <thead>
                            <tr>
                                <th>Quotations</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th class="align-right">Total</th>
                                <th>Status</th>
                                <th class="align-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map((q, index) => {
                                const status = q.status || 'Uninvoiced';
                                const isInvoiced = status === 'Invoice';
                                const badgeClass = isInvoiced ? 'quotation-status-badge quotation-status-badge--invoice' : 'quotation-status-badge quotation-status-badge--uninvoiced';
                                const toggleClass = isInvoiced ? 'quotation-status-toggle quotation-status-toggle--active' : 'quotation-status-toggle';
                                const toggleIcon = isInvoiced ? 'fa-check' : 'fa-circle';
                                const toggleLabel = isInvoiced ? 'Invoiced' : 'Mark Invoice';
                                return `
                                <tr class="${isInvoiced ? 'quotation-row--invoiced' : ''}">
                                    <td class="quotation-no-cell">${escapeHtml(q.quotationNo)}</td>
                                    <td class="quotation-customer-cell">
                                        <span class="quotation-customer-flag">🇸🇦</span>
                                        <span>${escapeHtml(q.customerName)}</span>
                                    </td>
                                    <td>${escapeHtml(q.date || '')}</td>
                                    <td class="align-right quotation-total-cell">${formatCurrency(convertCurrency(q.total || q.subtotal || 0))}</td>
                                    <td>
                                        <span class="${badgeClass}">
                                            <i class="fas ${isInvoiced ? 'fa-circle-check' : 'fa-hourglass-half'}"></i>
                                            ${escapeHtml(status)}
                                        </span>
                                    </td>
                                    <td class="align-center quotation-actions-cell">
                                        <button onclick="showQuotationForm('${q.id}')" class="quotation-action-btn" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button onclick="deleteQuotation('${q.id}')" class="quotation-action-btn quotation-action-btn--danger" title="Delete"><i class="fas fa-trash"></i></button>
                                        <button onclick="printQuotationById('${q.id}')" class="quotation-action-btn" title="Print"><i class="fas fa-print"></i></button>
                                        <button onclick="toggleQuotationStatus('${q.id}')" class="${toggleClass}" title="${toggleLabel}">
                                            <i class="fas ${toggleIcon}"></i>
                                            <span>${toggleLabel}</span>
                                        </button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function filterQuotations() {
            renderQuotations();
        }

        async function toggleQuotationStatus(id) {
            const quotation = quotations.find(q => q.id === id);
            if (!quotation) return;
            quotation.status = quotation.status === 'Invoice' ? 'Uninvoiced' : 'Invoice';
            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('updateQuotation', {
                        quotation: {
                            id: quotation.id,
                            quotation_no: quotation.quotationNo,
                            customer_id: quotation.customerId || '',
                            customer_name: quotation.customerName || '',
                            date: quotation.date || '',
                            subtotal: Number(quotation.subtotal || quotation.total || 0),
                            total: Number(quotation.total || quotation.subtotal || 0),
                            vat: Number(quotation.vatRate || 0),
                            discount: Number(quotation.discount || 0),
                            status: quotation.status || 'Uninvoiced',
                            items: JSON.stringify(Array.isArray(quotation.items) ? quotation.items : [])
                        }
                    });
                } catch (error) {
                    console.error('Failed to update quotation status in API.', error);
                }
            } else {
                saveData();
            }
            renderQuotations();
        }

        function showQuotationForm(id = null) {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('quotationFormView').style.display = 'block';
            document.getElementById('quotationFormTitle').innerText = id ? 'View Quotation' : 'Create Quotation';
            renderQuotationCustomerSelect();
            document.getElementById('quotationDate').value = new Date().toISOString().split('T')[0];
            const itemsContainer = document.getElementById('quotationItemsInputContainer');
            itemsContainer.innerHTML = '';
            quotationItemCounter = 0;
            if (id) {
                const quotation = quotations.find(q => q.id === id);
                if (quotation) {
                    document.getElementById('quotationNoDisplay').value = quotation.quotationNo;
                    document.getElementById('quotationDate').value = quotation.date || new Date().toISOString().split('T')[0];
                    document.getElementById('quotationCustomerSelect').value = quotation.customerName;
                    if (quotation.items && quotation.items.length) {
                        quotation.items.forEach(item => {
                            addQuotationItemInput();
                            const rows = itemsContainer.querySelectorAll('.quotation-item-row');
                            const lastRow = rows[rows.length - 1];
                            if (lastRow) {
                                lastRow.querySelector('.item-name').value = item.name || '';
                                lastRow.querySelector('.item-qty').value = item.quantity || 1;
                                lastRow.querySelector('.item-price').value = item.price || 0;
                                lastRow.querySelector('.item-discount').value = item.discount || 0;
                            }
                        });
                    } else {
                        addQuotationItemInput();
                    }
                }
            } else {
                generateQuotationNumber();
                document.getElementById('quotationCustomerSelect').value = '';
                addQuotationItemInput();
            }
            updateQuotationPreview();
        }

        function generateQuotationNumber() {
            document.getElementById('quotationNoDisplay').value = `QTN-${nextQuotationNumber}`;
        }

        async function saveQuotation() {
            const customerName = document.getElementById('quotationCustomerSelect').value;
            if (!customerName) {
                alert('Please select a customer');
                return;
            }
            const items = getQuotationItemsFromInputs();
            if (items.length === 0) {
                alert('Please add at least one quotation item');
                return;
            }
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price * (1 - item.discount / 100)), 0);
            const quotation = {
                id: Date.now().toString(),
                quotationNo: document.getElementById('quotationNoDisplay').value,
                customerName: customerName,
                items: items,
                subtotal: subtotal,
                total: subtotal,
                date: document.getElementById('quotationDate').value || new Date().toISOString().split('T')[0],
                status: 'Uninvoiced'
            };
            
            quotations.push(quotation);

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('addQuotation', {
                        quotation: {
                            id: quotation.id,
                            quotation_no: quotation.quotationNo,
                            customer_id: quotation.customerId || '',
                            customer_name: quotation.customerName,
                            date: quotation.date,
                            subtotal: quotation.subtotal,
                            total: quotation.total,
                            vat: Number(quotation.vatRate || 0),
                            discount: Number(quotation.discount || 0),
                            status: quotation.status,
                            items: JSON.stringify(quotation.items || [])
                        }
                    });
                } catch (error) {
                    console.error('Failed to save quotation in API.', error);
                }
            }

            nextQuotationNumber++;
            saveData();
            showQuotations();
            alert('Quotation saved successfully!');
        }

        function printQuotation() {
            const printContent = document.getElementById('quotationPreview').innerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html><head><title>Print Quotation</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f0f2f5; }
                    .invoice-card { background: #ffffff; padding: 30px; border-radius: 20px; max-width: 900px; margin: 0 auto; color: #1a1a2e; }
                    .invoice-card-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 28px; }
                    .invoice-company-name { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
                    .invoice-company p { margin: 4px 0; color: #444; }
                    .invoice-logo { max-height: 80px; object-fit: contain; margin-bottom: 10px; }
                    .invoice-meta-box { text-align: right; }
                    .invoice-type { font-size: 30px; font-weight: 700; letter-spacing: 1px; margin-bottom: 15px; }
                    .invoice-meta-row { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 8px; font-size: 15px; }
                    .invoice-meta-row span { color: #555; }
                    .invoice-card-body { display: grid; gap: 24px; }
                    .invoice-card-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e6e8eb; }
                    .invoice-card-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
                    .invoice-card-section h3 { margin-bottom: 10px; font-size: 18px; }
                    .invoice-card-section p { margin: 4px 0; color: #444; }
                    .invoice-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .invoice-table th, .invoice-table td { padding: 14px 12px; border-bottom: 1px solid #e6e8eb; }
                    .invoice-table th { background: #f7f8fb; color: #333; text-align: left; font-size: 13px; letter-spacing: 0.03em; text-transform: uppercase; }
                    .invoice-table td { color: #444; }
                    .invoice-summary-box { width: 100%; max-width: 360px; margin-left: auto; margin-top: 26px; padding: 20px; border-radius: 16px; background: #f7f8fb; }
                    .summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; color: #333; }
                    .summary-row--total { font-weight: 700; border-top: 1px solid #e6e8eb; margin-top: 12px; padding-top: 16px; }
                    .invoice-card-footer { margin-top: 40px; text-align: center; color: #666; }
                </style>
                </head><body>${printContent}</body></html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }

        function printQuotationById(id) {
            showQuotationForm(id);
            setTimeout(() => printQuotation(), 200);
        }

        function downloadQuotationPDFById(id) {
            showQuotationForm(id);
            setTimeout(() => downloadQuotationPDF(), 200);
        }

        function sendQuotationEmailById(id) {
            showQuotationForm(id);
            setTimeout(() => sendQuotationEmail(), 200);
        }

        async function deleteQuotation(id) {
            const index = quotations.findIndex(q => q.id === id);
            if (index !== -1 && confirm('Delete this quotation?')) {
                if (isApiEnabled()) {
                    try {
                        await window.APIClient.postData('deleteQuotation', { id });
                    } catch (error) {
                        console.error('Failed to delete quotation from API.', error);
                    }
                }
                quotations.splice(index, 1);
                saveData();
                showQuotations();
            }
        }

        function downloadQuotationPDF() {
            const element = document.getElementById('quotationPreview');
            html2pdf().from(element).save('quotation.pdf');
        }

        function sendQuotationEmail() {
            const customerName = document.getElementById('quotationCustomerSelect').value;
            const customer = customers.find(c => c.name === customerName);
            if (customer && customer.email) {
                const subject = `Quotation ${document.getElementById('quotationNoDisplay').value}`;
                const body = `Dear ${customerName},\n\nPlease find attached our quotation.\n\nBest regards,\n${JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}').companyName || 'Company'}`;
                window.open(`mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
            } else {
                alert('Customer email not found');
            }
        }

        function sendQuotationWhatsApp() {
            const customerName = document.getElementById('quotationCustomerSelect').value;
            const customer = customers.find(c => c.name === customerName);
            if (customer && customer.phone) {
                const message = `Dear ${customerName},\n\nPlease find our quotation ${document.getElementById('quotationNoDisplay').value}.\n\nBest regards,\n${JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}').companyName || 'Company'}`;
                window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
            } else {
                alert('Customer phone not found');
            }
        }


        // ==================== REPORTS ====================
        async function showReports() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('reportsView').style.display = 'block';
            setActiveNav('navReports');
            await loadReports();
        }

        async function loadReports() {
            updateReportDataSourceStatus();
            if (isApiEnabled()) {
                try {
                    await Promise.all([
                        syncCustomersFromApi(),
                        syncProductsFromApi(),
                        syncInvoicesFromApi(),
                        syncHRFromApi(),
                        syncSupplierPurchasesFromApi(),
                        syncExpensesFromApi()
                    ]);
                    updateReportDataSourceStatus();
                } catch (error) {
                    console.error('Reports API refresh failed:', error);
                    updateReportDataSourceStatus('API refresh failed, using local cache');
                }
            }

            initializeReportFilters();
            filterReports();
        }

        function updateReportDataSourceStatus(overrideText = '') {
            const statusEl = document.getElementById('reportDataSourceStatus');
            if (!statusEl) return;
            if (overrideText) {
                statusEl.textContent = overrideText;
                return;
            }
            statusEl.textContent = isApiEnabled() ? 'Google Sheets (Live)' : 'Local Cache';
        }

        function initializeReportFilters() {
            const preset = document.getElementById('reportFilterPreset');
            const fromInput = document.getElementById('reportFromDate');
            const toInput = document.getElementById('reportToDate');
            if (!preset || !fromInput || !toInput) return;

            if (!preset.value) {
                preset.value = 'thisMonth';
            }

            if (!fromInput.value || !toInput.value) {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                fromInput.value = toIsoDate(start);
                toInput.value = toIsoDate(today);
            }

            toggleReportCustomRange(preset.value === 'custom');
        }

        function toggleReportCustomRange(isVisible) {
            const customRange = document.getElementById('reportCustomRange');
            if (customRange) {
                customRange.style.display = isVisible ? 'grid' : 'none';
            }
        }

        function filterReports() {
            const filters = getActiveReportFilters();
            toggleReportCustomRange(filters.preset === 'custom');
            const stats = calculateStats(filters);
            latestReportStats = stats;
            renderReportOverview(stats);
            renderReportTables(stats);
            renderCharts(stats);
        }

        function getActiveReportFilters() {
            return {
                preset: document.getElementById('reportFilterPreset')?.value || 'thisMonth',
                from: document.getElementById('reportFromDate')?.value || '',
                to: document.getElementById('reportToDate')?.value || ''
            };
        }

        function calculateStats(filters) {
            const range = getReportDateRange(filters.preset, filters.from, filters.to);
            const filteredInvoices = invoices.filter(invoice => isDateWithinRange(invoice.date, range));
            const filteredExpenses = expenses.filter(expense => isDateWithinRange(expense.date, range));
            const filteredAttendance = hrAttendance.filter(row => isDateWithinRange(row.date, range));
            const filteredLeaves = hrLeaves.filter(row => rangesOverlap(row.fromDate, row.toDate, range.start, range.end));

            const totalSales = filteredInvoices.reduce((sum, invoice) => sum + convertCurrency(Number(invoice.total || 0), invoice.currency || 'SAR'), 0);
            const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + convertCurrency(Number(expense.amount || 0)), 0);
            const netProfit = totalSales - totalExpenses;

            const invoiceStatuses = filteredInvoices.reduce((acc, invoice) => {
                const status = getInvoiceReportStatus(invoice);
                acc[status] += 1;
                return acc;
            }, { Paid: 0, Pending: 0, Overdue: 0 });

            const averageInvoiceValue = filteredInvoices.length ? totalSales / filteredInvoices.length : 0;
            const salesTrend = buildTimeSeries(filteredInvoices, range, invoice => invoice.date, invoice => convertCurrency(Number(invoice.total || 0), invoice.currency || 'SAR'));
            const expenseTrend = buildTimeSeries(filteredExpenses, range, expense => expense.date, expense => convertCurrency(Number(expense.amount || 0)));
            const profitTrend = {
                labels: salesTrend.labels,
                revenue: salesTrend.values,
                expenses: expenseTrend.values,
                profit: salesTrend.values.map((value, index) => value - (expenseTrend.values[index] || 0))
            };

            const customerStats = buildCustomerAnalytics(filteredInvoices, totalSales);
            const productStats = buildProductAnalytics(filteredInvoices);
            const expenseStats = buildExpenseAnalytics(filteredExpenses, range);
            const hrStats = buildHRAnalytics(filteredAttendance, filteredLeaves);
            const vatStats = buildVatAnalytics(filteredInvoices, range);
            const growth = calculateSalesGrowth(range, totalSales);
            const dailySales = calculateSalesForRange(getReportDateRange('today'));
            const monthlySales = calculateSalesForRange(getReportDateRange('thisMonth'));
            const yearlySales = calculateSalesForRange(getReportDateRange('thisYear'));

            const insights = buildReportInsights({
                totalSales,
                totalExpenses,
                netProfit,
                invoiceStatuses,
                averageInvoiceValue,
                customerStats,
                productStats,
                hrStats,
                vatStats,
                growth
            });

            return {
                filters,
                range,
                rangeLabel: formatReportRangeLabel(range),
                totalSales,
                totalExpenses,
                netProfit,
                totalInvoices: filteredInvoices.length,
                pendingInvoices: invoiceStatuses.Pending,
                paidInvoices: invoiceStatuses.Paid,
                overdueInvoices: invoiceStatuses.Overdue,
                averageInvoiceValue,
                dailySales,
                monthlySales,
                yearlySales,
                growth,
                filteredInvoices,
                filteredExpenses,
                salesTrend,
                profitTrend,
                customerStats,
                productStats,
                expenseStats,
                hrStats,
                vatStats,
                invoiceStatuses,
                insights
            };
        }

        function parseReportDate(value) {
            if (!value) return null;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return null;
            date.setHours(0, 0, 0, 0);
            return date;
        }

        function toIsoDate(date) {
            return date.toISOString().split('T')[0];
        }

        function startOfDay(date) {
            const output = new Date(date);
            output.setHours(0, 0, 0, 0);
            return output;
        }

        function endOfDay(date) {
            const output = new Date(date);
            output.setHours(23, 59, 59, 999);
            return output;
        }

        function getStartOfWeek(date) {
            const output = startOfDay(date);
            const day = output.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            output.setDate(output.getDate() + diff);
            return output;
        }

        function getReportDateRange(preset, fromValue = '', toValue = '') {
            const today = new Date();
            let start = startOfDay(today);
            let end = endOfDay(today);

            switch (preset) {
                case 'today':
                    break;
                case 'thisWeek':
                    start = getStartOfWeek(today);
                    break;
                case 'thisMonth':
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    end = endOfDay(today);
                    break;
                case 'thisYear':
                    start = new Date(today.getFullYear(), 0, 1);
                    end = endOfDay(today);
                    break;
                case 'custom': {
                    const from = parseReportDate(fromValue) || startOfDay(today);
                    const to = parseReportDate(toValue) || endOfDay(today);
                    start = from <= to ? from : to;
                    end = from <= to ? endOfDay(to) : endOfDay(from);
                    break;
                }
                default:
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    end = endOfDay(today);
                    break;
            }

            return { start, end };
        }

        function formatReportRangeLabel(range) {
            const sameDay = toIsoDate(range.start) === toIsoDate(range.end);
            if (sameDay) return range.start.toLocaleDateString();
            return `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`;
        }

        function getPreviousRange(range) {
            const duration = range.end.getTime() - range.start.getTime();
            const previousEnd = new Date(range.start.getTime() - 1);
            const previousStart = new Date(previousEnd.getTime() - duration);
            return { start: startOfDay(previousStart), end: endOfDay(previousEnd) };
        }

        function isDateWithinRange(value, range) {
            const date = parseReportDate(value);
            if (!date) return false;
            return date >= startOfDay(range.start) && date <= endOfDay(range.end);
        }

        function rangesOverlap(startValue, endValue, rangeStart, rangeEnd) {
            const start = parseReportDate(startValue);
            const end = parseReportDate(endValue) || start;
            if (!start || !end) return false;
            return start <= endOfDay(rangeEnd) && end >= startOfDay(rangeStart);
        }

        function normalizeReportKey(value) {
            return String(value || '').trim().toLowerCase();
        }

        function resolveCustomerName(invoice) {
            return invoice.customerName || customers.find(customer => String(customer.id) === String(invoice.customerId || ''))?.name || 'Unknown Customer';
        }

        function getInvoiceReportStatus(invoice) {
            const status = String(invoice.status || '').toLowerCase();
            const amountDue = Number(invoice.amountDue != null ? invoice.amountDue : invoice.total || 0);
            if (status === 'paid' || amountDue <= 0) return 'Paid';

            const dueDate = parseReportDate(invoice.dueDate);
            if (dueDate && dueDate < startOfDay(new Date())) return 'Overdue';
            return 'Pending';
        }

        function getInvoiceVatAmount(invoice) {
            const items = Array.isArray(invoice.items) ? invoice.items : [];
            if (!items.length) {
                const subtotal = Number(invoice.subtotal || 0);
                const total = Number(invoice.total || 0);
                const shipping = Number(invoice.shipping || 0);
                const advance = Number(invoice.advancePayment || 0);
                return Math.max(0, total - subtotal - shipping + advance);
            }

            return items.reduce((sum, item) => sum + calculateLineAmounts(item).vatAmount, 0);
        }

        function calculateSalesForRange(range) {
            return invoices
                .filter(invoice => isDateWithinRange(invoice.date, range))
                .reduce((sum, invoice) => sum + convertCurrency(Number(invoice.total || 0), invoice.currency || 'SAR'), 0);
        }

        function calculateSalesGrowth(range, currentSales) {
            const previousRange = getPreviousRange(range);
            const previousSales = calculateSalesForRange(previousRange);
            const percent = previousSales > 0
                ? ((currentSales - previousSales) / previousSales) * 100
                : (currentSales > 0 ? 100 : 0);

            return {
                percent,
                previousSales,
                label: 'Compared with previous period'
            };
        }

        function buildTimeSeries(records, range, dateAccessor, valueAccessor) {
            const daySpan = Math.max(1, Math.ceil((endOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / 86400000) + 1);
            const granularity = daySpan <= 31 ? 'day' : (daySpan <= 366 ? 'month' : 'year');
            const buckets = [];
            const cursor = new Date(range.start);

            if (granularity === 'day') {
                while (cursor <= range.end) {
                    buckets.push({
                        key: toIsoDate(cursor),
                        label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        value: 0
                    });
                    cursor.setDate(cursor.getDate() + 1);
                }
            } else if (granularity === 'month') {
                cursor.setDate(1);
                while (cursor <= range.end) {
                    buckets.push({
                        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
                        label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                        value: 0
                    });
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            } else {
                cursor.setMonth(0, 1);
                while (cursor <= range.end) {
                    buckets.push({
                        key: String(cursor.getFullYear()),
                        label: String(cursor.getFullYear()),
                        value: 0
                    });
                    cursor.setFullYear(cursor.getFullYear() + 1);
                }
            }

            const bucketMap = Object.fromEntries(buckets.map(bucket => [bucket.key, bucket]));

            records.forEach(record => {
                const date = parseReportDate(dateAccessor(record));
                if (!date || date < range.start || date > range.end) return;

                let key = toIsoDate(date);
                if (granularity === 'month') {
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                } else if (granularity === 'year') {
                    key = String(date.getFullYear());
                }

                if (bucketMap[key]) {
                    bucketMap[key].value += Number(valueAccessor(record) || 0);
                }
            });

            return {
                labels: buckets.map(bucket => bucket.label),
                values: buckets.map(bucket => Number(bucket.value.toFixed(2))),
                granularity
            };
        }

        function buildCustomerAnalytics(filteredInvoices, totalRevenue) {
            const customerMap = {};
            const allTimeCustomerCounts = {};

            invoices.forEach(invoice => {
                const name = resolveCustomerName(invoice);
                allTimeCustomerCounts[name] = (allTimeCustomerCounts[name] || 0) + 1;
            });

            filteredInvoices.forEach(invoice => {
                const name = resolveCustomerName(invoice);
                if (!customerMap[name]) {
                    customerMap[name] = { name, total: 0, invoices: 0 };
                }
                customerMap[name].total += convertCurrency(Number(invoice.total || 0), invoice.currency || 'SAR');
                customerMap[name].invoices += 1;
            });

            const rows = Object.values(customerMap).sort((a, b) => b.total - a.total);
            const customerMix = rows.reduce((acc, row) => {
                if ((allTimeCustomerCounts[row.name] || 0) > 1) {
                    acc.returning += 1;
                } else {
                    acc.newCustomers += 1;
                }
                return acc;
            }, { newCustomers: 0, returning: 0 });

            return {
                rows,
                topCustomers: rows.slice(0, 5),
                mix: customerMix,
                strongestCustomer: rows[0] || null,
                totalRevenue
            };
        }

        function buildProductAnalytics(filteredInvoices) {
            const productLookup = Object.fromEntries(savedProducts.map(product => [normalizeReportKey(product.name), product]));
            const metrics = {};

            filteredInvoices.forEach(invoice => {
                (Array.isArray(invoice.items) ? invoice.items : []).forEach(item => {
                    const name = item.name || 'Unnamed Item';
                    const key = normalizeReportKey(name);
                    const amounts = calculateLineAmounts(item);
                    const cost = Number(productLookup[key]?.cost || 0) * amounts.quantity;

                    if (!metrics[key]) {
                        metrics[key] = {
                            name,
                            quantity: 0,
                            revenue: 0,
                            profit: 0
                        };
                    }

                    metrics[key].quantity += amounts.quantity;
                    metrics[key].revenue += amounts.total;
                    metrics[key].profit += amounts.total - cost;
                });
            });

            const rows = Object.values(metrics).sort((a, b) => b.revenue - a.revenue);
            const profitableRows = [...rows].sort((a, b) => b.profit - a.profit);
            const bestSellingRows = [...rows].sort((a, b) => b.quantity - a.quantity);

            return {
                rows,
                topRevenueRows: rows.slice(0, 6),
                topSelling: bestSellingRows[0] || null,
                mostProfitable: profitableRows[0] || null,
                spotlight: profitableRows.slice(0, 5)
            };
        }

        function buildExpenseAnalytics(filteredExpenses, range) {
            const categories = {};
            filteredExpenses.forEach(expense => {
                const category = expense.category || 'General';
                categories[category] = (categories[category] || 0) + convertCurrency(Number(expense.amount || 0));
            });

            return {
                rows: Object.entries(categories)
                    .map(([category, amount]) => ({ category, amount }))
                    .sort((a, b) => b.amount - a.amount),
                trend: buildTimeSeries(filteredExpenses, range, expense => expense.date, expense => convertCurrency(Number(expense.amount || 0))),
                monthlyTrend: buildMonthlySeries(filteredExpenses, range, expense => expense.date, expense => convertCurrency(Number(expense.amount || 0)))
            };
        }

        function buildMonthlySeries(records, range, dateAccessor, valueAccessor) {
            const startMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
            const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
            const buckets = [];
            const cursor = new Date(startMonth);

            while (cursor <= endMonth) {
                buckets.push({
                    key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
                    label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                    value: 0
                });
                cursor.setMonth(cursor.getMonth() + 1);
            }

            const map = Object.fromEntries(buckets.map(bucket => [bucket.key, bucket]));

            records.forEach(record => {
                const date = parseReportDate(dateAccessor(record));
                if (!date || date < range.start || date > range.end) return;
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (map[key]) {
                    map[key].value += Number(valueAccessor(record) || 0);
                }
            });

            return {
                labels: buckets.map(bucket => bucket.label),
                values: buckets.map(bucket => Number(bucket.value.toFixed(2)))
            };
        }

        function buildHRAnalytics(filteredAttendance, filteredLeaves) {
            const attendance = filteredAttendance.reduce((acc, row) => {
                const status = String(row.status || '').toLowerCase();
                if (status === 'present') acc.present += 1;
                else if (status === 'late') acc.late += 1;
                else acc.absent += 1;
                return acc;
            }, { present: 0, late: 0, absent: 0 });

            const leaveByType = filteredLeaves.reduce((acc, row) => {
                const type = row.type || 'Other';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            const employeeRows = hrEmployees.map(employee => {
                const attendanceRows = filteredAttendance.filter(row => String(row.employeeId || '') === String(employee.id));
                const leaveRows = filteredLeaves.filter(row => String(row.employeeId || '') === String(employee.id));

                const attendanceTotals = attendanceRows.reduce((acc, row) => {
                    const status = String(row.status || '').toLowerCase();
                    if (status === 'present') acc.present += 1;
                    else if (status === 'late') acc.late += 1;
                    else acc.absent += 1;
                    const overtime = Number(row.overtimeHours || row.overtime_hours || row.overtime || 0);
                    acc.overtimeHours += Number.isFinite(overtime) ? overtime : 0;
                    return acc;
                }, { present: 0, late: 0, absent: 0, overtimeHours: 0 });

                const totalDays = attendanceTotals.present + attendanceTotals.late + attendanceTotals.absent;
                const attendanceRate = totalDays > 0 ? ((attendanceTotals.present + (attendanceTotals.late * 0.5)) / totalDays) : 0;
                const leavePenalty = Math.min(leaveRows.length * 2, 20);
                const overtimeBonus = Math.min(attendanceTotals.overtimeHours * 0.5, 10);
                const score = Math.max(0, Math.min(100, Math.round((attendanceRate * 100) - leavePenalty + overtimeBonus)));

                return {
                    id: employee.id,
                    name: employee.name || employee.id,
                    present: attendanceTotals.present,
                    late: attendanceTotals.late,
                    absent: attendanceTotals.absent,
                    leaves: leaveRows.length,
                    overtimeHours: Number(attendanceTotals.overtimeHours.toFixed(2)),
                    performanceScore: score
                };
            });

            const performanceRows = [...employeeRows]
                .sort((a, b) => b.performanceScore - a.performanceScore)
                .slice(0, 8);

            const overtimeRows = [...employeeRows]
                .filter(row => row.overtimeHours > 0)
                .sort((a, b) => b.overtimeHours - a.overtimeHours)
                .slice(0, 8);

            const totalOvertimeHours = employeeRows.reduce((sum, row) => sum + row.overtimeHours, 0);

            return {
                totalEmployees: hrEmployees.length,
                attendance,
                totalLeaves: filteredLeaves.length,
                leaveByType: Object.entries(leaveByType).map(([type, count]) => ({ type, count })),
                salaryExpense: hrEmployees.reduce((sum, employee) => sum + convertCurrency(Number(employee.salary || 0)), 0),
                performanceRows,
                overtimeRows,
                totalOvertimeHours: Number(totalOvertimeHours.toFixed(2))
            };
        }

        function buildVatAnalytics(filteredInvoices, range) {
            const rows = filteredInvoices.map(invoice => ({
                invoiceNo: invoice.invoiceNo || invoice.id,
                customerName: resolveCustomerName(invoice),
                vat: convertCurrency(getInvoiceVatAmount(invoice), invoice.currency || 'SAR')
            })).sort((a, b) => b.vat - a.vat);

            const trend = buildTimeSeries(filteredInvoices, range, invoice => invoice.date, invoice => convertCurrency(getInvoiceVatAmount(invoice), invoice.currency || 'SAR'));
            const totalVat = rows.reduce((sum, row) => sum + row.vat, 0);
            const monthlyRows = trend.labels.map((label, index) => ({
                month: label,
                vat: Number((trend.values[index] || 0).toFixed(2))
            }));

            return {
                rows,
                trend,
                monthlyRows,
                totalVat,
                averageVat: filteredInvoices.length ? totalVat / filteredInvoices.length : 0
            };
        }

        function buildReportInsights(context) {
            const insights = [];
            const expenseRatio = context.totalSales > 0 ? (context.totalExpenses / context.totalSales) * 100 : 0;

            if (context.customerStats.strongestCustomer) {
                insights.push({
                    title: `${context.customerStats.strongestCustomer.name} is the strongest customer`,
                    detail: `Generated ${formatCurrencyPlain(context.customerStats.strongestCustomer.total)} across ${context.customerStats.strongestCustomer.invoices} invoices.`
                });
            }

            if (context.productStats.topSelling) {
                insights.push({
                    title: `${context.productStats.topSelling.name} is the top-selling item`,
                    detail: `Sold ${context.productStats.topSelling.quantity.toFixed(2)} units in the selected period.`
                });
            }

            insights.push({
                title: `${context.invoiceStatuses.Overdue} overdue invoice(s) need follow-up`,
                detail: `Average invoice value is ${formatCurrencyPlain(context.averageInvoiceValue)}.`
            });

            insights.push({
                title: `Expenses consumed ${expenseRatio.toFixed(1)}% of sales`,
                detail: `Net profit currently stands at ${formatCurrencyPlain(context.netProfit)}.`
            });

            insights.push({
                title: `VAT collected totals ${formatCurrencyPlain(context.vatStats.totalVat)}`,
                detail: `Attendance logged ${context.hrStats.attendance.present + context.hrStats.attendance.late + context.hrStats.attendance.absent} entries in the selected range.`
            });

            return insights;
        }

        function renderReportOverview(stats) {
            setReportValue('reportTotalSales', formatCurrency(stats.totalSales));
            setReportValue('reportTotalExpenses', formatCurrency(stats.totalExpenses));
            setReportValue('reportNetProfit', formatCurrency(stats.netProfit));
            setReportValue('reportTotalInvoices', String(stats.totalInvoices));
            setReportValue('reportDailySales', formatCurrency(stats.dailySales));
            setReportValue('reportMonthlySales', formatCurrency(stats.monthlySales));
            setReportValue('reportYearlySales', formatCurrency(stats.yearlySales));
            setReportValue('reportSalesGrowth', `${stats.growth.percent >= 0 ? '+' : ''}${stats.growth.percent.toFixed(1)}%`);
            setReportValue('reportSalesGrowthMeta', stats.growth.label);
            setReportValue('reportActiveRangeLabel', stats.rangeLabel);
            setReportValue('reportSalesTrendMeta', `Grouped by ${stats.salesTrend.granularity}`);
        }

        function setReportValue(id, value) {
            const element = document.getElementById(id);
            if (!element) return;
            element.innerHTML = value;
        }

        function renderReportTables(stats) {
            renderReportList('reportExpenseBreakdownList', stats.expenseStats.rows.slice(0, 6), row => ({
                title: row.category,
                value: formatCurrency(row.amount),
                meta: 'Expense category total'
            }), 'No expense records found.');

            renderReportList('reportHRSummaryList', [
                { title: 'Total Employees', value: String(stats.hrStats.totalEmployees), meta: 'Active employees in HR database' },
                { title: 'Attendance Summary', value: `${stats.hrStats.attendance.present} Present / ${stats.hrStats.attendance.late} Late / ${stats.hrStats.attendance.absent} Absent`, meta: 'Selected period attendance' },
                { title: 'Leave Requests', value: String(stats.hrStats.totalLeaves), meta: stats.hrStats.leaveByType.map(item => `${item.type}: ${item.count}`).join(' | ') || 'No leave records' },
                { title: 'Monthly Salary Expense', value: formatCurrency(stats.hrStats.salaryExpense), meta: 'Current payroll baseline' },
                { title: 'Overtime Hours', value: `${stats.hrStats.totalOvertimeHours.toFixed(2)} h`, meta: 'Total overtime in selected period' }
            ], row => row, 'No HR data available.');

            renderReportList('reportEmployeePerformanceList', stats.hrStats.performanceRows, row => ({
                title: row.name,
                value: `${row.performanceScore}%`,
                meta: `P:${row.present} L:${row.late} A:${row.absent} Leave:${row.leaves}`
            }), 'No employee performance data for selected range.');

            renderReportList('reportOvertimeList', stats.hrStats.overtimeRows, row => ({
                title: row.name,
                value: `${row.overtimeHours.toFixed(2)} h`,
                meta: `Performance ${row.performanceScore}%`
            }), 'No overtime records available in selected range.');

            renderReportList('reportInvoiceSummaryList', [
                { title: 'Paid Invoices', value: String(stats.paidInvoices), meta: 'Settled invoices in selected range' },
                { title: 'Pending Invoices', value: String(stats.pendingInvoices), meta: 'Awaiting payment' },
                { title: 'Overdue Invoices', value: String(stats.overdueInvoices), meta: 'Past due date and unpaid' },
                { title: 'Average Invoice Value', value: formatCurrency(stats.averageInvoiceValue), meta: 'Average billing size' }
            ], row => row, 'No invoice data available.');

            renderReportList('reportVatSummaryList', [
                { title: 'Total VAT Collected', value: formatCurrency(stats.vatStats.totalVat), meta: 'VAT from selected invoices' },
                { title: 'Average VAT Per Invoice', value: formatCurrency(stats.vatStats.averageVat), meta: 'Average VAT loading' },
                ...stats.vatStats.rows.slice(0, 3).map(row => ({ title: row.invoiceNo, value: formatCurrency(row.vat), meta: row.customerName }))
            ], row => row, 'No VAT records found.');

            renderReportList('reportVatMonthlySummaryList', stats.vatStats.monthlyRows, row => ({
                title: row.month,
                value: formatCurrency(row.vat),
                meta: 'Monthly VAT'
            }), 'No monthly VAT summary available.');

            renderReportList('reportInsightsList', stats.insights, row => ({
                title: row.title,
                value: '',
                meta: row.detail
            }), 'No insights available.');

            const vatTableBody = document.getElementById('reportVatInvoiceTableBody');
            if (vatTableBody) {
                vatTableBody.innerHTML = stats.vatStats.rows.map(row =>
                    `<tr><td>${escapeHtml(row.invoiceNo)}</td><td>${escapeHtml(row.customerName)}</td><td>${formatCurrency(row.vat)}</td></tr>`
                ).join('') || '<tr><td colspan="3">No VAT per invoice data.</td></tr>';
            }

            const customerTableBody = document.getElementById('reportCustomerSalesTableBody');
            if (customerTableBody) {
                customerTableBody.innerHTML = stats.customerStats.rows.map(row => {
                    const share = stats.totalSales > 0 ? `${((row.total / stats.totalSales) * 100).toFixed(1)}%` : '0%';
                    return `<tr><td>${escapeHtml(row.name)}</td><td>${row.invoices}</td><td>${formatCurrency(row.total)}</td><td>${share}</td></tr>`;
                }).join('') || '<tr><td colspan="4">No customer sales data.</td></tr>';
            }

            const topCustomersTableBody = document.getElementById('reportTopCustomersTableBody');
            if (topCustomersTableBody) {
                topCustomersTableBody.innerHTML = stats.customerStats.topCustomers.map(row => {
                    const share = stats.totalSales > 0 ? `${((row.total / stats.totalSales) * 100).toFixed(1)}%` : '0%';
                    return `<tr><td>${escapeHtml(row.name)}</td><td>${row.invoices}</td><td>${formatCurrency(row.total)}</td><td>${share}</td></tr>`;
                }).join('') || '<tr><td colspan="4">No top customer data.</td></tr>';
            }

            const recentInvoicesTableBody = document.getElementById('reportRecentInvoicesTableBody');
            if (recentInvoicesTableBody) {
                const recent = stats.filteredInvoices
                    .slice()
                    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                    .slice(0, 10);

                recentInvoicesTableBody.innerHTML = recent.map(invoice =>
                    `<tr>
                        <td>${escapeHtml(invoice.invoiceNo || invoice.id || '-')}</td>
                        <td>${escapeHtml(resolveCustomerName(invoice))}</td>
                        <td>${escapeHtml(invoice.date || '-')}</td>
                        <td>${escapeHtml(getInvoiceReportStatus(invoice))}</td>
                        <td>${formatCurrency(convertCurrency(Number(invoice.total || 0), invoice.currency || 'SAR'))}</td>
                    </tr>`
                ).join('') || '<tr><td colspan="5">No recent invoices in selected range.</td></tr>';
            }

            const productPerformanceTableBody = document.getElementById('reportProductPerformanceTableBody');
            if (productPerformanceTableBody) {
                productPerformanceTableBody.innerHTML = stats.productStats.rows
                    .slice(0, 12)
                    .map(row =>
                        `<tr>
                            <td>${escapeHtml(row.name)}</td>
                            <td>${row.quantity.toFixed(2)}</td>
                            <td>${formatCurrency(row.revenue)}</td>
                            <td>${formatCurrency(row.profit)}</td>
                        </tr>`
                    ).join('') || '<tr><td colspan="4">No product performance data.</td></tr>';
            }
        }

        function renderReportList(elementId, rows, mapper, emptyText) {
            const container = document.getElementById(elementId);
            if (!container) return;

            if (!rows.length) {
                container.innerHTML = `<p>${escapeHtml(emptyText)}</p>`;
                return;
            }

            container.innerHTML = rows.map(row => {
                const mapped = mapper(row);
                return `<div class="report-list-item"><span>${escapeHtml(mapped.title)}</span><div style="text-align:right;">${mapped.value ? `<strong>${mapped.value}</strong>` : ''}${mapped.meta ? `<small>${escapeHtml(mapped.meta)}</small>` : ''}</div></div>`;
            }).join('');
        }

        function renderCharts(stats) {
            const palette = getReportPalette();

            createReportChart('salesTrend', 'reportSalesTrendChart', {
                type: 'line',
                data: {
                    labels: stats.salesTrend.labels,
                    datasets: [{
                        label: 'Sales',
                        data: stats.salesTrend.values,
                        borderColor: palette.accent,
                        backgroundColor: 'rgba(74, 144, 226, 0.16)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2
                    }]
                },
                options: getBaseChartOptions(palette)
            });

            createReportChart('profitLoss', 'reportProfitLossChart', {
                type: 'line',
                data: {
                    labels: stats.profitTrend.labels,
                    datasets: [
                        { label: 'Revenue', data: stats.profitTrend.revenue, borderColor: palette.accent, backgroundColor: 'rgba(74, 144, 226, 0.12)', tension: 0.35, borderWidth: 2 },
                        { label: 'Expenses', data: stats.profitTrend.expenses, borderColor: palette.danger, backgroundColor: 'rgba(220, 53, 69, 0.1)', tension: 0.35, borderWidth: 2 },
                        { label: 'Profit', data: stats.profitTrend.profit, borderColor: palette.success, backgroundColor: 'rgba(40, 167, 69, 0.1)', tension: 0.35, borderWidth: 2 }
                    ]
                },
                options: getBaseChartOptions(palette)
            });

            createReportChart('monthlyExpense', 'reportMonthlyExpenseChart', {
                type: 'bar',
                data: {
                    labels: stats.expenseStats.monthlyTrend.labels,
                    datasets: [{
                        label: 'Monthly Expenses',
                        data: stats.expenseStats.monthlyTrend.values,
                        backgroundColor: palette.danger,
                        borderRadius: 10
                    }]
                },
                options: getBaseChartOptions(palette, true)
            });

            createReportChart('attendanceMix', 'reportAttendanceMixChart', {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Late', 'Absent'],
                    datasets: [{
                        data: [stats.hrStats.attendance.present, stats.hrStats.attendance.late, stats.hrStats.attendance.absent],
                        backgroundColor: [palette.success, palette.warning, palette.danger],
                        borderWidth: 0
                    }]
                },
                options: getCircularChartOptions(palette)
            });

            createReportChart('employeePerformance', 'reportEmployeePerformanceChart', {
                type: 'bar',
                data: {
                    labels: stats.hrStats.performanceRows.map(row => row.name),
                    datasets: [{
                        label: 'Performance Score %',
                        data: stats.hrStats.performanceRows.map(row => row.performanceScore),
                        backgroundColor: palette.accent,
                        borderRadius: 10
                    }]
                },
                options: getBaseChartOptions(palette, true)
            });

            createReportChart('overtime', 'reportOvertimeChart', {
                type: 'bar',
                data: {
                    labels: stats.hrStats.overtimeRows.map(row => row.name),
                    datasets: [{
                        label: 'Overtime Hours',
                        data: stats.hrStats.overtimeRows.map(row => Number(row.overtimeHours.toFixed(2))),
                        backgroundColor: palette.info,
                        borderRadius: 10
                    }]
                },
                options: getBaseChartOptions(palette, true)
            });

            createReportChart('customerMix', 'reportCustomerMixChart', {
                type: 'doughnut',
                data: {
                    labels: ['New Customers', 'Returning Customers'],
                    datasets: [{
                        data: [stats.customerStats.mix.newCustomers, stats.customerStats.mix.returning],
                        backgroundColor: [palette.warning, palette.accent],
                        borderWidth: 0
                    }]
                },
                options: getCircularChartOptions(palette)
            });

            createReportChart('productRevenue', 'reportProductRevenueChart', {
                type: 'bar',
                data: {
                    labels: stats.productStats.topRevenueRows.map(row => row.name),
                    datasets: [{
                        label: 'Revenue',
                        data: stats.productStats.topRevenueRows.map(row => Number(row.revenue.toFixed(2))),
                        backgroundColor: palette.accent,
                        borderRadius: 10
                    }]
                },
                options: getBaseChartOptions(palette, true)
            });

            createReportChart('vatTrend', 'reportVatTrendChart', {
                type: 'line',
                data: {
                    labels: stats.vatStats.trend.labels,
                    datasets: [{
                        label: 'VAT',
                        data: stats.vatStats.trend.values,
                        borderColor: palette.info,
                        backgroundColor: 'rgba(23, 162, 184, 0.12)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2
                    }]
                },
                options: getBaseChartOptions(palette)
            });
        }

        function getReportPalette() {
            const styles = getComputedStyle(document.body);
            return {
                accent: styles.getPropertyValue('--accent').trim() || '#4a90e2',
                success: styles.getPropertyValue('--success').trim() || '#28a745',
                warning: styles.getPropertyValue('--warning').trim() || '#ffc107',
                danger: styles.getPropertyValue('--danger').trim() || '#dc3545',
                info: styles.getPropertyValue('--info').trim() || '#17a2b8',
                text: styles.getPropertyValue('--text-primary').trim() || '#1a1a2e',
                secondary: styles.getPropertyValue('--text-secondary').trim() || '#666',
                border: styles.getPropertyValue('--border-color').trim() || '#e0e0e0'
            };
        }

        function getBaseChartOptions(palette, horizontalTicks = false) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: palette.text } }
                },
                scales: {
                    x: {
                        ticks: { color: palette.secondary, maxRotation: horizontalTicks ? 0 : 45, minRotation: 0 },
                        grid: { color: palette.border }
                    },
                    y: {
                        ticks: { color: palette.secondary },
                        grid: { color: palette.border }
                    }
                }
            };
        }

        function getCircularChartOptions(palette) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: palette.text }
                    }
                }
            };
        }

        function createReportChart(key, canvasId, config) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            if (reportCharts[key]) {
                reportCharts[key].destroy();
            }
            reportCharts[key] = new Chart(canvas, config);
        }

        function exportReportsToExcel() {
            if (!latestReportStats || typeof XLSX === 'undefined') return;

            const workbook = XLSX.utils.book_new();

            const summarySheet = XLSX.utils.aoa_to_sheet([
                ['Metric', 'Value'],
                ['Active Range', latestReportStats.rangeLabel],
                ['Total Sales', latestReportStats.totalSales],
                ['Total Expenses', latestReportStats.totalExpenses],
                ['Net Profit', latestReportStats.netProfit],
                ['Total Invoices', latestReportStats.totalInvoices],
                ['Pending Invoices', latestReportStats.pendingInvoices],
                ['Paid Invoices', latestReportStats.paidInvoices],
                ['Overdue Invoices', latestReportStats.overdueInvoices],
                ['Average Invoice Value', latestReportStats.averageInvoiceValue],
                ['Daily Sales', latestReportStats.dailySales],
                ['Monthly Sales', latestReportStats.monthlySales],
                ['Yearly Sales', latestReportStats.yearlySales],
                ['Sales Growth %', latestReportStats.growth.percent]
            ]);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            const customerSheet = XLSX.utils.json_to_sheet(latestReportStats.customerStats.rows.map(row => ({
                Customer: row.name,
                Invoices: row.invoices,
                Sales: row.total,
                Share: latestReportStats.totalSales > 0 ? (row.total / latestReportStats.totalSales) : 0
            })));
            XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customers');

            const productSheet = XLSX.utils.json_to_sheet(latestReportStats.productStats.rows.map(row => ({
                Product: row.name,
                Quantity: row.quantity,
                Revenue: row.revenue,
                Profit: row.profit
            })));
            XLSX.utils.book_append_sheet(workbook, productSheet, 'Products');

            const expenseSheet = XLSX.utils.json_to_sheet(latestReportStats.expenseStats.rows.map(row => ({
                Category: row.category,
                Amount: row.amount
            })));
            XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');

            const vatSheet = XLSX.utils.json_to_sheet(latestReportStats.vatStats.rows.map(row => ({
                Invoice: row.invoiceNo,
                Customer: row.customerName,
                VAT: row.vat
            })));
            XLSX.utils.book_append_sheet(workbook, vatSheet, 'VAT');

            XLSX.writeFile(workbook, `reports-analytics-${Date.now()}.xlsx`);
        }

        function exportReportsPDF() {
            if (typeof html2pdf === 'undefined') return;
            const element = document.getElementById('reportsView');
            if (!element) return;

            html2pdf().set({
                margin: 0.4,
                filename: `reports-analytics-${Date.now()}.pdf`,
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            }).from(element).save();
        }

        function printReports() {
            window.print();
        }

        function printReportSection(sectionId, sectionTitle = 'Report Section') {
            const section = document.getElementById(sectionId);
            if (!section) return;

            // Clone the section and replace canvases with images so charts print correctly.
            const sectionClone = section.cloneNode(true);
            const sourceCanvases = section.querySelectorAll('canvas');
            const cloneCanvases = sectionClone.querySelectorAll('canvas');
            cloneCanvases.forEach((canvasEl, index) => {
                const sourceCanvas = sourceCanvases[index];
                if (!sourceCanvas) {
                    canvasEl.remove();
                    return;
                }

                let dataUrl = '';
                try {
                    dataUrl = sourceCanvas.toDataURL('image/png');
                } catch (error) {
                    dataUrl = '';
                }

                if (!dataUrl) {
                    canvasEl.remove();
                    return;
                }

                const img = document.createElement('img');
                img.src = dataUrl;
                img.alt = sourceCanvas.id || 'Chart';
                img.style.cssText = 'max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:8px;';
                canvasEl.replaceWith(img);
            });

            const printWindow = window.open('', '_blank', 'width=1100,height=850');
            if (!printWindow) return;

            const styles = `
                body { font-family: Segoe UI, Tahoma, sans-serif; padding: 20px; color: #111827; background: #fff; }
                h1 { margin: 0 0 14px; }
                .meta { color: #6b7280; margin-bottom: 14px; }
                .chart-card, .report-card, .report-kpi-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                .report-table { width: 100%; border-collapse: collapse; }
                .report-table th, .report-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
                .report-table th { background: #f9fafb; }
                .report-list-item { display: flex; justify-content: space-between; gap: 10px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
                .report-section-actions, .btn-secondary, .btn-primary, button { display: none !important; }
                canvas { max-width: 100%; }
                @media print { body { padding: 0; } }
            `;

            printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(sectionTitle)}</title><style>${styles}</style></head><body>`);
            printWindow.document.write(`<h1>${escapeHtml(sectionTitle)}</h1>`);
            printWindow.document.write(`<div class="meta">Generated: ${new Date().toLocaleString()}</div>`);
            printWindow.document.write(sectionClone.outerHTML);
            printWindow.document.write('<script>window.onload=function(){window.print();};<\/script>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
        }

        function printVATReportsSection() {
            if (!latestReportStats) return;
            const stats = latestReportStats;
            const vatImg = reportCharts.vatTrend ? reportCharts.vatTrend.toBase64Image() : '';
            const rangeLabel = escapeHtml(stats.rangeLabel || 'N/A');

            const invoiceRows = stats.vatStats.rows.map(row =>
                `<tr><td>${escapeHtml(row.invoiceNo)}</td><td>${escapeHtml(row.customerName)}</td><td>${formatCurrency(row.vat)}</td></tr>`
            ).join('') || '<tr><td colspan="3">No VAT per invoice data</td></tr>';

            const monthlyRows = stats.vatStats.monthlyRows.map(row =>
                `<tr><td>${escapeHtml(row.month)}</td><td>${formatCurrency(row.vat)}</td></tr>`
            ).join('') || '<tr><td colspan="2">No monthly VAT data</td></tr>';

            const w = window.open('', '_blank', 'width=1000,height=820');
            if (!w) return;

            w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VAT Report</title>
<style>
body{font-family:Segoe UI,Tahoma,sans-serif;padding:20px;color:#111827;background:#fff}
h1{margin:0 0 6px}.meta{color:#6b7280;margin-bottom:16px}
.kpi-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}
.card{border:1px solid #e5e7eb;border-radius:10px;padding:12px}
.kpi{font-size:22px;font-weight:700;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{border:1px solid #e5e7eb;padding:8px;font-size:13px;text-align:left}
th{background:#f9fafb}
img.chart{max-width:100%;border:1px solid #e5e7eb;border-radius:8px;margin-top:8px}
@media print{body{padding:0}}
</style></head><body>
<h1>Tax / VAT Report (Saudi)</h1>
<div class="meta">Range: ${rangeLabel} | Useful for ZATCA reporting</div>
<div class="kpi-wrap">
  <div class="card"><div>Total VAT Collected</div><div class="kpi">${formatCurrency(stats.vatStats.totalVat)}</div></div>
  <div class="card"><div>Average VAT Per Invoice</div><div class="kpi">${formatCurrency(stats.vatStats.averageVat)}</div></div>
</div>
<div class="card"><h3>VAT Trend</h3>${vatImg ? `<img class="chart" src="${vatImg}" alt="VAT trend chart">` : '<p>No chart</p>'}</div>
<div class="card" style="margin-top:12px;"><h3>VAT Per Invoice</h3><table><thead><tr><th>Invoice</th><th>Customer</th><th>VAT</th></tr></thead><tbody>${invoiceRows}</tbody></table></div>
<div class="card" style="margin-top:12px;"><h3>VAT Summary Monthly</h3><table><thead><tr><th>Month</th><th>VAT</th></tr></thead><tbody>${monthlyRows}</tbody></table></div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
            w.document.close();
        }

                function printHRReportsSection() {
                        if (!latestReportStats) return;

                        const stats = latestReportStats;
                        const rangeLabel = escapeHtml(stats.rangeLabel || 'N/A');
                        const attendanceImg = reportCharts.attendanceMix ? reportCharts.attendanceMix.toBase64Image() : '';
                        const performanceImg = reportCharts.employeePerformance ? reportCharts.employeePerformance.toBase64Image() : '';
                        const overtimeImg = reportCharts.overtime ? reportCharts.overtime.toBase64Image() : '';

                        const performanceRows = stats.hrStats.performanceRows.map(row =>
                                `<tr><td>${escapeHtml(row.name)}</td><td>${row.performanceScore}%</td><td>${row.present}</td><td>${row.absent}</td><td>${row.leaves}</td><td>${row.overtimeHours.toFixed(2)} h</td></tr>`
                        ).join('') || '<tr><td colspan="6">No performance data</td></tr>';

                        const overtimeRows = stats.hrStats.overtimeRows.map(row =>
                                `<tr><td>${escapeHtml(row.name)}</td><td>${row.overtimeHours.toFixed(2)} h</td><td>${row.performanceScore}%</td></tr>`
                        ).join('') || '<tr><td colspan="3">No overtime data</td></tr>';

                        const w = window.open('', '_blank', 'width=1100,height=850');
                        if (!w) return;

                        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HR Reports</title>
<style>
body{font-family:Segoe UI,Tahoma,sans-serif;padding:20px;color:#111827;background:#fff}
h1{margin:0 0 6px} .meta{color:#6b7280;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:16px}
.card{border:1px solid #e5e7eb;border-radius:10px;padding:12px}
.kpi{font-size:22px;font-weight:700;margin-top:6px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{border:1px solid #e5e7eb;padding:8px;font-size:13px;text-align:left}
th{background:#f9fafb}
img.chart{max-width:100%;border:1px solid #e5e7eb;border-radius:8px;margin-top:8px}
@media print{body{padding:0} .no-print{display:none}}
</style></head><body>
<h1>HR Reports</h1>
<div class="meta">Range: ${rangeLabel}</div>

<div class="grid">
    <div class="card"><div>Total Employees</div><div class="kpi">${stats.hrStats.totalEmployees}</div></div>
    <div class="card"><div>Monthly Salary Expense</div><div class="kpi">${formatCurrency(stats.hrStats.salaryExpense)}</div></div>
    <div class="card"><div>Attendance (P/L/A)</div><div class="kpi">${stats.hrStats.attendance.present} / ${stats.hrStats.attendance.late} / ${stats.hrStats.attendance.absent}</div></div>
    <div class="card"><div>Total Overtime</div><div class="kpi">${stats.hrStats.totalOvertimeHours.toFixed(2)} h</div></div>
</div>

<div class="grid">
    <div class="card"><h3>Attendance Mix</h3>${attendanceImg ? `<img class="chart" src="${attendanceImg}" alt="Attendance chart">` : '<p>No chart</p>'}</div>
    <div class="card"><h3>Employee Performance</h3>${performanceImg ? `<img class="chart" src="${performanceImg}" alt="Performance chart">` : '<p>No chart</p>'}</div>
</div>

<div class="card"><h3>Overtime Chart</h3>${overtimeImg ? `<img class="chart" src="${overtimeImg}" alt="Overtime chart">` : '<p>No chart</p>'}</div>
<div class="card" style="margin-top:12px;"><h3>Employee Performance Table</h3><table><thead><tr><th>Employee</th><th>Score</th><th>Present</th><th>Absent</th><th>Leaves</th><th>Overtime</th></tr></thead><tbody>${performanceRows}</tbody></table></div>
<div class="card" style="margin-top:12px;"><h3>Overtime Table</h3><table><thead><tr><th>Employee</th><th>Overtime</th><th>Score</th></tr></thead><tbody>${overtimeRows}</tbody></table></div>

<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
                        w.document.close();
                }

        // ==================== SETTINGS ====================
        function showSettings() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('settingsView').style.display = 'block';
            setActiveNav('navSettings');
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            document.getElementById('companyName').value = settings.companyName || '';
            document.getElementById('companyVatNumber').value = settings.companyVatNumber || '';
            document.getElementById('companyMobile').value = settings.companyMobile || '';
            document.getElementById('companyEmail').value = settings.companyEmail || '';
            document.getElementById('companyWebsite').value = settings.companyWebsite || '';
            document.getElementById('apiUrlInput').value = (window.API_URL || localStorage.getItem('gs_api_url') || '').trim();
            document.getElementById('companyAddress').innerHTML = settings.companyAddress || '';
            // Show logo preview if exists
            const logoPreview = document.getElementById('companyLogoPreview');
            logoPreview.innerHTML = '';
            if (settings.companyLogo) {
                logoPreview.innerHTML = `<img src="${settings.companyLogo}" alt="Logo" style="max-width:120px;max-height:80px;">`;
            }
            document.getElementById('companyLogoInput').value = '';
            pendingCompanyLogoData = '';
            const pasteArea = document.getElementById('companyLogoPasteArea');
            if (pasteArea) {
                pasteArea.innerText = 'Paste logo image here with Ctrl+V';
            }

            const vatTaxToggle = document.getElementById('vatTaxEnabledToggle');
            if (vatTaxToggle) {
                vatTaxToggle.checked = typeof settings.vatTaxEnabled === 'undefined'
                    ? true
                    : Boolean(settings.vatTaxEnabled);
            }
        }

        function handleCompanyLogoPaste(event) {
            const clipboard = event.clipboardData || window.clipboardData;
            if (!clipboard || !clipboard.items) return;

            for (const item of clipboard.items) {
                if (!item.type || !item.type.startsWith('image/')) continue;

                event.preventDefault();
                const file = item.getAsFile();
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    pendingCompanyLogoData = e.target.result;
                    const logoPreview = document.getElementById('companyLogoPreview');
                    if (logoPreview) {
                        logoPreview.innerHTML = `<img src="${pendingCompanyLogoData}" alt="Pasted Logo" style="max-width:120px;max-height:80px;">`;
                    }
                    const pasteArea = document.getElementById('companyLogoPasteArea');
                    if (pasteArea) {
                        pasteArea.innerText = 'Image pasted successfully. Click Save Settings to apply.';
                    }
                };
                reader.readAsDataURL(file);
                return;
            }
        }

        function saveSettings() {
            const name = document.getElementById('companyName').value;
            const vat = document.getElementById('companyVatNumber').value;
            const mobile = document.getElementById('companyMobile').value;
            const email = document.getElementById('companyEmail').value;
            const website = document.getElementById('companyWebsite').value;
            const apiUrl = document.getElementById('apiUrlInput').value.trim();
            const address = document.getElementById('companyAddress').innerHTML.trim();
            const normalizedAddress = address
                .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
                .replace(/^(<br\s*\/?>\s*)+|(<br\s*\/?>\s*)+$/gi, '');
            const logoInput = document.getElementById('companyLogoInput');
            const vatTaxToggle = document.getElementById('vatTaxEnabledToggle');
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            settings.companyName = name;
            settings.companyVatNumber = vat;
            settings.companyMobile = mobile;
            settings.companyEmail = email;
            settings.companyWebsite = website;
            settings.companyAddress = normalizedAddress;
            settings.vatTaxEnabled = vatTaxToggle ? Boolean(vatTaxToggle.checked) : true;

            if (window.APIClient?.setApiUrl) {
                window.APIClient.setApiUrl(apiUrl);
            } else {
                window.API_URL = apiUrl;
                if (apiUrl) localStorage.setItem('gs_api_url', apiUrl);
                else localStorage.removeItem('gs_api_url');
            }

            if (pendingCompanyLogoData) {
                settings.companyLogo = pendingCompanyLogoData;
            }

            // Handle logo upload
            if (logoInput.files && logoInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    settings.companyLogo = e.target.result;
                    localStorage.setItem('pro_invoice_settings', JSON.stringify(settings));
                    saveSettingsToApi(settings).catch(error => {
                        console.error('Failed to sync settings to API.', error);
                    });
                    setVatTaxEnabled(settings.vatTaxEnabled);
                    applySidebarBranding();
                    alert('Settings saved!');
                    showSettings();
                };
                reader.readAsDataURL(logoInput.files[0]);
                return;
            }
            localStorage.setItem('pro_invoice_settings', JSON.stringify(settings));
            saveSettingsToApi(settings).catch(error => {
                console.error('Failed to sync settings to API.', error);
            });
            setVatTaxEnabled(settings.vatTaxEnabled);
            applySidebarBranding();
            alert('Settings saved!');
            showSettings();
        }

        // ==================== CURRENCY & DARK MODE ====================
        function setCurrency(currency) {
            currentCurrency = currency;
            document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            updateDashboard();
            updateCharts();
            if (document.getElementById('invoiceListView').style.display === 'block') renderInvoiceTable();
            if (document.getElementById('customersView').style.display === 'block') renderCustomers();
        }

        function convertCurrency(amount, fromCurrency = 'SAR') {
            if (fromCurrency !== 'SAR') {
                amount = amount / exchangeRates[fromCurrency];
            }
            return amount * exchangeRates[currentCurrency];
        }

        function formatCurrencyPlain(amount) {
            return `${currencySymbols[currentCurrency]} ${amount.toFixed(2)}`;
        }

        function formatCurrency(amount) {
            if (currentCurrency === 'SAR') {
                return `<span style="display:inline-flex;align-items:center;gap:6px;"><img src="${saudiRiyalSymbolPath}" alt="SR" style="width:14px;height:14px;object-fit:contain;vertical-align:middle;"> <span>${amount.toFixed(2)}</span></span>`;
            }
            return formatCurrencyPlain(amount);
        }

        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        }

        // ==================== UTILITIES ====================
        function createNewInvoice() {
            try {
                // Hide all views and show invoice form
                document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
                document.getElementById('invoiceFormView').style.display = 'block';
                
                // Update active nav button
                setActiveNav('navCreate');
                
                // Reset form
                document.getElementById('formTitle').innerText = 'Create Invoice';
                
                // Set current date
                const today = new Date().toISOString().split('T')[0];
                const invoiceDate = document.getElementById('invoiceDate');
                if (invoiceDate) invoiceDate.value = today;
                
                // Clear form fields
                const formFields = [
                    'customerNameInput', 'customerPhoneInput', 'customerEmailInput',
                    'customerCompanyInput', 'customerVatInput', 'customerAddressInput', 'vatRateInput',
                    'discountInput', 'shippingInput', 'advancePaymentInput', 'dueDate'
                ];
                formFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.value = fieldId === 'vatRateInput' ? '15' : 
                                     fieldId === 'discountInput' ? '0' : '';
                    }
                });
                
                // Clear customer select
                const customerSelect = document.getElementById('customerSelect');
                if (customerSelect) customerSelect.value = '';
                
                // Reset invoice number
                generateInvoiceNumber();
                
                // Repopulate customer select
                renderCustomerSelect();
                
                // Clear items table
                itemCounter = 0;
                const productsBody = document.getElementById('invoiceItemsTableBody');
                if (productsBody) {
                    productsBody.innerHTML = '';
                }
                
                // Add first item
                addItemInput();
                
                // Update totals
                updateTotals();
                
                // Update preview
                if (typeof updatePreview === 'function') {
                    updatePreview();
                }
                
                console.log('New invoice form initialized successfully');
            } catch (error) {
                console.error('Error creating new invoice:', error);
                alert('Error: Could not create new invoice. Please try again.');
            }
        }

        async function showDashboard() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('dashboardView').style.display = 'block';
            setActiveNav('navDashboard');
            if (isApiEnabled()) {
                try { await Promise.all([syncCustomersFromApi(), syncInvoicesFromApi()]); } catch (error) { console.error(error); }
            }
            updateDashboard();
            updateCharts();
        }

        async function showCustomers() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('customersView').style.display = 'block';
            setActiveNav('navCustomers');
            if (isApiEnabled()) {
                try { await syncCustomersFromApi(); } catch (error) { console.error(error); }
            }
            renderCustomers();
        }

        async function showHR() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('hrView').style.display = 'block';
            setActiveNav('navHR');
            if (isApiEnabled()) {
                try { await syncHRFromApi(); } catch (error) { console.error(error); }
            }
            const today = new Date().toISOString().split('T')[0];
            const attendanceDate = document.getElementById('hrAttendanceDate');
            if (attendanceDate && !attendanceDate.value) attendanceDate.value = today;
            const leaveFrom = document.getElementById('hrLeaveFrom');
            if (leaveFrom && !leaveFrom.value) leaveFrom.value = today;
            const leaveTo = document.getElementById('hrLeaveTo');
            if (leaveTo && !leaveTo.value) leaveTo.value = today;
            renderHRData();
        }

        function renderHRData() {
            renderHREmployeeOptions();
            renderHREmployees();
            renderHRAttendance();
            renderHRLeaves();
            renderHRTasks();
            renderHRStats();
        }

        function buildEmployeeCode() {
            return `EMP-${Date.now().toString().slice(-6)}`;
        }

        function renderEmployeePhotoPreview(photoData) {
            const preview = document.getElementById('hrEmployeePhotoPreview');
            const placeholder = document.getElementById('hrEmployeePhotoPlaceholder');
            const removeBtn = document.getElementById('hrEmployeePhotoRemoveBtn');

            if (!preview || !placeholder || !removeBtn) return;

            if (photoData) {
                preview.src = photoData;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                removeBtn.style.display = 'inline-flex';
            } else {
                preview.src = '';
                preview.style.display = 'none';
                placeholder.style.display = 'block';
                removeBtn.style.display = 'none';
            }
        }

        function handleEmployeePhotoUpload(event) {
            const file = event.target?.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                event.target.value = '';
                return;
            }

            if (file.size > 1024 * 1024) {
                alert('Profile photo must be 1 MB or smaller.');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                currentEmployeePhoto = String(reader.result || '');
                renderEmployeePhotoPreview(currentEmployeePhoto);
            };
            reader.readAsDataURL(file);
        }

        function removeEmployeePhoto() {
            currentEmployeePhoto = '';
            const input = document.getElementById('hrEmployeePhoto');
            if (input) input.value = '';
            renderEmployeePhotoPreview('');
        }

        function showAddEmployeeModal() {
            window.currentEmployeeId = null;
            currentEmployeePhoto = '';
            const form = document.getElementById('employeeForm');
            if (form) form.reset();
            const idField = document.getElementById('hrEmployeeId');
            if (idField) idField.value = buildEmployeeCode();
            const titleEl = document.getElementById('employeeModalTitle');
            if (titleEl) titleEl.textContent = 'Add Employee';
            renderEmployeePhotoPreview('');
            document.getElementById('employeeModal').style.display = 'flex';
        }

        function editHREmployee(id) {
            const emp = hrEmployees.find(e => e.id === id);
            if (!emp) return;
            window.currentEmployeeId = id;
            currentEmployeePhoto = emp.profilePhoto || '';
            document.getElementById('hrEmployeeId').value = emp.id;
            document.getElementById('hrEmployeeName').value = emp.name || '';
            document.getElementById('hrEmployeeRole').value = emp.role || '';
            document.getElementById('hrEmployeeDepartment').value = emp.department || '';
            document.getElementById('hrEmployeeSalary').value = emp.salary || '';
            document.getElementById('hrEmployeeEmail').value = emp.email || '';
            document.getElementById('hrEmployeeMobile').value = emp.mobile || '';
            document.getElementById('hrEmployeeWebsite').value = emp.website || '';
            document.getElementById('hrEmployeeHomeAddress').value = emp.homeAddress || '';
            const titleEl = document.getElementById('employeeModalTitle');
            if (titleEl) titleEl.textContent = 'Edit Employee';
            const photoInput = document.getElementById('hrEmployeePhoto');
            if (photoInput) photoInput.value = '';
            renderEmployeePhotoPreview(currentEmployeePhoto);
            document.getElementById('employeeModal').style.display = 'flex';
        }

        async function addHREmployee(event) {
            if (event) event.preventDefault();

            const id = document.getElementById('hrEmployeeId')?.value.trim() || buildEmployeeCode();
            const name = document.getElementById('hrEmployeeName')?.value.trim();
            const role = document.getElementById('hrEmployeeRole')?.value.trim();
            const department = document.getElementById('hrEmployeeDepartment')?.value.trim();
            const salary = parseFloat(document.getElementById('hrEmployeeSalary')?.value) || 0;
            const email = document.getElementById('hrEmployeeEmail')?.value.trim() || '';
            const mobile = document.getElementById('hrEmployeeMobile')?.value.trim() || '';
            const homeAddress = document.getElementById('hrEmployeeHomeAddress')?.value.trim() || '';
            const website = document.getElementById('hrEmployeeWebsite')?.value.trim() || '';

            if (!name) {
                alert('Employee name is required.');
                return;
            }

            const employee = {
                id,
                name,
                role,
                department,
                salary,
                email,
                mobile,
                homeAddress,
                website,
                profilePhoto: currentEmployeePhoto
            };

            if (isApiEnabled()) {
                try {
                    const action = window.currentEmployeeId ? 'updateEmployee' : 'addEmployee';
                    await window.APIClient.postData(action, {
                        employee: {
                            id: employee.id,
                            name: employee.name,
                            role: employee.role,
                            department: employee.department,
                            salary: employee.salary,
                            email: employee.email,
                            mobile: employee.mobile,
                            home_address: employee.homeAddress,
                            website: employee.website,
                            profile_photo: employee.profilePhoto
                        }
                    });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Employee API save failed:', error);
                    return;
                }
            } else {
                if (window.currentEmployeeId) {
                    const idx = hrEmployees.findIndex(e => e.id === window.currentEmployeeId);
                    if (idx !== -1) hrEmployees[idx] = employee;
                } else {
                    hrEmployees.push(employee);
                }
                saveData();
            }

            closeEmployeeModal();
            renderHRData();
        }

        document.getElementById('employeeForm')?.addEventListener('submit', addHREmployee);
        document.getElementById('hrEmployeePhoto')?.addEventListener('change', handleEmployeePhotoUpload);

        async function deleteHREmployee(id) {
            if (!confirm('Delete this employee?')) return;
            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('deleteEmployee', { id });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Delete employee failed:', error);
                    return;
                }
            } else {
                hrEmployees = hrEmployees.filter(e => e.id !== id);
                hrAttendance = hrAttendance.filter(a => a.employeeId !== id);
                hrLeaves = hrLeaves.filter(l => l.employeeId !== id);
                saveData();
            }
            renderHRData();
        }

        function printHREmployee(id) {
            const emp = hrEmployees.find(e => e.id === id);
            if (!emp) return;
            const settings = JSON.parse(localStorage.getItem('pro_invoice_settings') || '{}');
            const companyName = settings.companyName || '';
            const w = window.open('', '_blank', 'width=680,height=720');
            w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Employee Profile - ${escapeHtml(emp.name)}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #f0f2f5; margin: 0; padding: 30px; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.12); max-width: 520px; margin: 0 auto; overflow: hidden; }
  .card-header { background: linear-gradient(135deg, #1a1a2e 0%, #4a90e2 100%); color:#fff; padding: 28px 30px; text-align: center; }
    .profile-photo { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,.35); margin: 0 auto 14px; display: block; }
    .profile-photo-placeholder { width: 88px; height: 88px; border-radius: 50%; margin: 0 auto 14px; background: rgba(255,255,255,.16); border: 3px solid rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; font-size: 28px; }
  .card-header h2 { margin: 0 0 4px; font-size: 22px; }
  .card-header p { margin: 0; opacity: .8; font-size: 13px; }
  .card-body { padding: 20px 30px; }
  .field { display:flex; gap:12px; align-items:flex-start; padding:9px 0; border-bottom:1px solid #e8e8e8; font-size:13px; }
  .field:last-child { border-bottom:none; }
  .field label { width:120px; min-width:120px; font-weight:600; color:#555; }
  .badge { display:inline-block; padding:2px 10px; background:#4a90e2; color:#fff; border-radius:20px; font-size:12px; font-weight:600; }
  .footer { text-align:center; font-size:11px; color:#aaa; padding:12px; border-top:1px solid #eee; }
  @media print { body { background:#fff; padding:0; } .card { box-shadow:none; } }
<\/style><\/head><body>
<div class="card">
  <div class="card-header">
        ${emp.profilePhoto ? `<img src="${emp.profilePhoto}" alt="${escapeHtml(emp.name)}" class="profile-photo">` : '<div class="profile-photo-placeholder"><span>PHOTO</span></div>'}
    <h2>${escapeHtml(emp.name)}</h2>
    <p>${escapeHtml(emp.role || '')}${emp.department ? ' &mdash; ' + escapeHtml(emp.department) : ''}</p>
  </div>
  <div class="card-body">
    <div class="field"><label>Employee ID</label><span class="badge">${escapeHtml(emp.id)}</span></div>
    <div class="field"><label>Department</label><span>${escapeHtml(emp.department || '-')}</span></div>
    <div class="field"><label>Salary</label><span>${formatCurrency(convertCurrency(emp.salary || 0))}</span></div>
    <div class="field"><label>Email</label><span>${escapeHtml(emp.email || '-')}</span></div>
    <div class="field"><label>Mobile</label><span>${escapeHtml(emp.mobile || '-')}</span></div>
    <div class="field"><label>Website</label><span>${escapeHtml(emp.website || '-')}</span></div>
    <div class="field"><label>Home Address</label><span>${escapeHtml(emp.homeAddress || '-')}</span></div>
  </div>
  ${companyName ? `<div class="footer">${escapeHtml(companyName)}</div>` : ''}
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
            w.document.close();
        }

        function renderHREmployees() {
            const container = document.getElementById('hrEmployeeList');
            if (!container) return;

            if (hrEmployees.length === 0) {
                container.innerHTML = '<div class="supplier-list-shell"><p class="supplier-empty-state">No employees added yet.</p></div>';
                return;
            }

            container.innerHTML = `
                <div class="supplier-list-shell">
                    <div class="supplier-list-title">Employee Database</div>
                    <div class="supplier-table-wrap">
                        <table class="supplier-table">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Contact</th>
                                    <th>Salary</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${hrEmployees.map(emp => `
                                    <tr>
                                        <td class="supplier-id-cell">${escapeHtml(emp.id || '-')}</td>
                                        <td>
                                            <div class="supplier-primary-text">${escapeHtml(emp.name || '-')}</div>
                                            <div class="supplier-secondary-text">${escapeHtml(emp.email || '-')}</div>
                                        </td>
                                        <td>${escapeHtml(emp.role || '-')}</td>
                                        <td>${escapeHtml(emp.department || '-')}</td>
                                        <td>${escapeHtml(emp.mobile || '-')}</td>
                                        <td>${formatCurrency(convertCurrency(emp.salary || 0))}</td>
                                        <td>
                                            <div class="supplier-action-group">
                                                <button onclick="editHREmployee('${emp.id}')" class="supplier-action-btn supplier-action-btn--edit">Edit</button>
                                                <button onclick="printHREmployee('${emp.id}')" class="supplier-action-btn">Print</button>
                                                <button onclick="deleteHREmployee('${emp.id}')" class="supplier-action-btn supplier-action-btn--delete">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        function renderHREmployeeOptions() {
            const attendanceSelect = document.getElementById('hrAttendanceEmployee');
            const leaveSelect = document.getElementById('hrLeaveEmployee');
            const options = '<option value="">-- Select Employee --</option>' +
                hrEmployees.map(emp => `<option value="${emp.id}">${escapeHtml(emp.name)}</option>`).join('');

            if (attendanceSelect) attendanceSelect.innerHTML = options;
            if (leaveSelect) leaveSelect.innerHTML = options;
        }

        function resetHRAttendanceForm() {
            currentAttendanceId = null;
            const employeeField = document.getElementById('hrAttendanceEmployee');
            const dateField = document.getElementById('hrAttendanceDate');
            const statusField = document.getElementById('hrAttendanceStatus');
            const submitBtn = document.getElementById('hrAttendanceSubmitBtn');
            const cancelBtn = document.getElementById('hrAttendanceCancelBtn');

            if (employeeField) employeeField.value = '';
            if (dateField) dateField.value = '';
            if (statusField) statusField.value = 'Present';
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-clock"></i> Add Attendance';
            if (cancelBtn) cancelBtn.style.display = 'none';
        }

        function editHRAttendance(id) {
            const record = hrAttendance.find(item => item.id === id);
            if (!record) return;

            currentAttendanceId = id;
            document.getElementById('hrAttendanceEmployee').value = record.employeeId || '';
            document.getElementById('hrAttendanceDate').value = record.date || '';
            document.getElementById('hrAttendanceStatus').value = record.status || 'Present';

            const submitBtn = document.getElementById('hrAttendanceSubmitBtn');
            const cancelBtn = document.getElementById('hrAttendanceCancelBtn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Attendance';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
        }

        async function addHRAttendance() {
            const employeeId = document.getElementById('hrAttendanceEmployee')?.value;
            const date = document.getElementById('hrAttendanceDate')?.value;
            const status = document.getElementById('hrAttendanceStatus')?.value;

            if (!employeeId || !date) {
                alert('Select employee and date for attendance.');
                return;
            }

            const duplicate = hrAttendance.find(a => a.employeeId === employeeId && a.date === date && a.id !== currentAttendanceId);
            const record = {
                id: currentAttendanceId || duplicate?.id || Date.now().toString(),
                employeeId,
                date,
                status
            };

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData(currentAttendanceId || duplicate ? 'updateAttendance' : 'addAttendance', {
                        attendance: {
                            id: record.id,
                            employee_id: record.employeeId,
                            date: record.date,
                            status: record.status
                        }
                    });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Attendance API save failed:', error);
                    return;
                }
            } else {
                const existing = hrAttendance.find(a => a.id === record.id) || duplicate;
                if (existing) {
                    existing.employeeId = record.employeeId;
                    existing.date = record.date;
                    existing.status = record.status;
                } else {
                    hrAttendance.push(record);
                }
                saveData();
            }

            resetHRAttendanceForm();
            renderHRData();
        }

        async function deleteHRAttendance(id) {
            if (!confirm('Delete this attendance record?')) return;

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('deleteAttendance', { id });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Attendance delete failed:', error);
                    return;
                }
            } else {
                hrAttendance = hrAttendance.filter(item => item.id !== id);
                saveData();
            }

            if (currentAttendanceId === id) resetHRAttendanceForm();
            renderHRData();
        }

        function renderHRAttendance() {
            const container = document.getElementById('hrAttendanceList');
            if (!container) return;
            const rows = hrAttendance.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

            container.innerHTML = rows.map(row => {
                const emp = hrEmployees.find(e => e.id === row.employeeId);
                return `<div class="report-list-item"><span>${escapeHtml(emp?.name || 'Unknown')} - ${escapeHtml(row.date)}</span><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><strong>${escapeHtml(row.status)}</strong><button onclick="editHRAttendance('${row.id}')" class="btn-icon"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteHRAttendance('${row.id}')" class="btn-icon" style="background:#fee2e2;color:#b91c1c;"><i class="fas fa-trash"></i> Delete</button></div></div>`;
            }).join('') || '<p>No attendance records.</p>';
        }

        function resetHRLeaveForm() {
            currentLeaveId = null;
            const employeeField = document.getElementById('hrLeaveEmployee');
            const typeField = document.getElementById('hrLeaveType');
            const fromField = document.getElementById('hrLeaveFrom');
            const toField = document.getElementById('hrLeaveTo');
            const submitBtn = document.getElementById('hrLeaveSubmitBtn');
            const cancelBtn = document.getElementById('hrLeaveCancelBtn');

            if (employeeField) employeeField.value = '';
            if (typeField) typeField.value = 'Annual';
            if (fromField) fromField.value = '';
            if (toField) toField.value = '';
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> Add Leave';
            if (cancelBtn) cancelBtn.style.display = 'none';
        }

        function editHRLeave(id) {
            const leave = hrLeaves.find(item => item.id === id);
            if (!leave) return;

            currentLeaveId = id;
            document.getElementById('hrLeaveEmployee').value = leave.employeeId || '';
            document.getElementById('hrLeaveType').value = leave.type || 'Annual';
            document.getElementById('hrLeaveFrom').value = leave.fromDate || '';
            document.getElementById('hrLeaveTo').value = leave.toDate || '';

            const submitBtn = document.getElementById('hrLeaveSubmitBtn');
            const cancelBtn = document.getElementById('hrLeaveCancelBtn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Leave';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
        }

        async function addHRLeave() {
            const employeeId = document.getElementById('hrLeaveEmployee')?.value;
            const type = document.getElementById('hrLeaveType')?.value;
            const fromDate = document.getElementById('hrLeaveFrom')?.value;
            const toDate = document.getElementById('hrLeaveTo')?.value;

            if (!employeeId || !fromDate || !toDate) {
                alert('Select employee and leave dates.');
                return;
            }

            const leave = {
                id: currentLeaveId || Date.now().toString(),
                employeeId,
                type,
                fromDate,
                toDate,
                status: 'Pending'
            };

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData(currentLeaveId ? 'updateLeave' : 'addLeave', {
                        leave: {
                            id: leave.id,
                            employee_id: leave.employeeId,
                            type: leave.type,
                            from_date: leave.fromDate,
                            to_date: leave.toDate,
                            status: leave.status
                        }
                    });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Leave API save failed:', error);
                    return;
                }
            } else {
                const existing = hrLeaves.find(item => item.id === leave.id);
                if (existing) {
                    existing.employeeId = leave.employeeId;
                    existing.type = leave.type;
                    existing.fromDate = leave.fromDate;
                    existing.toDate = leave.toDate;
                    existing.status = leave.status;
                } else {
                    hrLeaves.push(leave);
                }
                saveData();
            }

            resetHRLeaveForm();
            renderHRData();
        }

        async function deleteHRLeave(id) {
            if (!confirm('Delete this leave request?')) return;

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('deleteLeave', { id });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Leave delete failed:', error);
                    return;
                }
            } else {
                hrLeaves = hrLeaves.filter(item => item.id !== id);
                saveData();
            }

            if (currentLeaveId === id) resetHRLeaveForm();
            renderHRData();
        }

        function renderHRLeaves() {
            const container = document.getElementById('hrLeaveList');
            if (!container) return;
            const rows = hrLeaves.slice().sort((a, b) => b.fromDate.localeCompare(a.fromDate)).slice(0, 10);

            container.innerHTML = rows.map(row => {
                const emp = hrEmployees.find(e => e.id === row.employeeId);
                return `<div class="report-list-item"><span>${escapeHtml(emp?.name || 'Unknown')} - ${escapeHtml(row.type)} (${escapeHtml(row.fromDate)} to ${escapeHtml(row.toDate)})</span><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><strong>${escapeHtml(row.status)}</strong><button onclick="editHRLeave('${row.id}')" class="btn-icon"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteHRLeave('${row.id}')" class="btn-icon" style="background:#fee2e2;color:#b91c1c;"><i class="fas fa-trash"></i> Delete</button></div></div>`;
            }).join('') || '<p>No leave requests.</p>';
        }

        async function addHRTask() {
            const title = document.getElementById('hrTaskTitle')?.value.trim();
            const priority = document.getElementById('hrTaskPriority')?.value;

            if (!title) {
                alert('Task title is required.');
                return;
            }

            const task = { id: Date.now().toString(), title, priority, done: false };

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('addTask', {
                        task: {
                            id: task.id,
                            title: task.title,
                            priority: task.priority,
                            status: 'Open'
                        }
                    });
                    await syncHRFromApi();
                } catch (error) {
                    console.error('Task API save failed:', error);
                    return;
                }
            } else {
                hrTasks.push(task);
                saveData();
            }

            document.getElementById('hrTaskTitle').value = '';
            renderHRData();
        }

        async function toggleHRTask(id) {
            const task = hrTasks.find(t => t.id === id);
            if (!task) return;
            task.done = !task.done;

            if (isApiEnabled()) {
                try {
                    await window.APIClient.postData('updateTask', {
                        task: {
                            id: task.id,
                            title: task.title,
                            priority: task.priority,
                            status: task.done ? 'Completed' : 'Open'
                        }
                    });
                } catch (error) {
                    console.error('Task API update failed:', error);
                    return;
                }
            } else {
                saveData();
            }

            renderHRData();
        }

        function renderHRTasks() {
            const container = document.getElementById('hrTaskList');
            if (!container) return;

            container.innerHTML = hrTasks.map(task => `
                <div class="report-list-item">
                    <span>${escapeHtml(task.title)} (${escapeHtml(task.priority)})</span>
                    <button class="btn-icon" onclick="toggleHRTask('${task.id}')">${task.done ? 'Completed' : 'Open'}</button>
                </div>
            `).join('') || '<p>No tasks.</p>';
        }

        function renderHRStats() {
            const today = new Date().toISOString().split('T')[0];
            const presentToday = hrAttendance.filter(a => a.date === today && a.status === 'Present').length;
            const leaveRequests = hrLeaves.filter(l => l.status === 'Pending').length;
            const openTasks = hrTasks.filter(t => !t.done).length;

            const totalEmployeesEl = document.getElementById('hrTotalEmployees');
            const presentTodayEl = document.getElementById('hrPresentToday');
            const leaveRequestsEl = document.getElementById('hrLeaveRequests');
            const openTasksEl = document.getElementById('hrOpenTasks');

            if (totalEmployeesEl) totalEmployeesEl.innerText = hrEmployees.length;
            if (presentTodayEl) presentTodayEl.innerText = presentToday;
            if (leaveRequestsEl) leaveRequestsEl.innerText = leaveRequests;
            if (openTasksEl) openTasksEl.innerText = openTasks;
        }

        async function showProducts() {
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            document.getElementById('productsView').style.display = 'block';
            setActiveNav('navProducts');
            if (isApiEnabled()) {
                try {
                    await Promise.all([syncProductsFromApi(), syncSuppliersFromApi()]);
                    updateSupplierOptions();
                } catch (error) {
                    console.error(error);
                }
            }
            renderProducts();
        }

        function setActiveNav(navId) {
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById(navId);
            if (activeBtn) activeBtn.classList.add('active');
        }

        function refreshSupplierCardsIfVisible() {
            if (document.getElementById('suppliersView')?.style.display === 'block') {
                renderSuppliers();
            }
        }

        function filterProducts() {
            renderProducts();
        }

        function addNewProductRow() {
            showAddProductModal();
        }

        async function updateProductField(id, field, value) {
            try {
                const product = savedProducts.find(p => p.id === id);
                if (!product) return;
                
                if (field === 'price' || field === 'tax' || field === 'cost') {
                    value = parseFloat(value) || 0;
                    if (value < 0) value = 0;
                } else if (field === 'vatIncluded' || field === 'dontUpdateQty') {
                    value = Boolean(value);
                } else {
                    value = value.trim();
                    if (field === 'name' && !value) {
                        alert('Product name cannot be empty');
                        renderProducts();
                        return;
                    }
                }
                
                product[field] = value;
                if (isApiEnabled()) {
                    await window.APIClient.postData('updateProduct', {
                        product: {
                            id: product.id,
                            name: product.name,
                            description: product.description,
                            price: product.price,
                            vat: product.tax,
                            supplier_id: product.supplierId || '',
                            supplier_name: product.supplierName || '',
                            cost: product.cost || 0,
                            vat_included: String(Boolean(product.vatIncluded)),
                            dont_update_qty: String(Boolean(product.dontUpdateQty))
                        }
                    });
                } else {
                    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
                }
                updateSavedProductsDatalist();
                refreshSupplierCardsIfVisible();
            } catch (error) {
                console.error('Error updating product field:', error);
            }
        }

        function renderProducts() {
            const searchTerm = document.getElementById('productSearchInput')?.value.toLowerCase() || '';
            const filtered = savedProducts.filter(product =>
                String(product.id || '').toLowerCase().includes(searchTerm) ||
                product.name.toLowerCase().includes(searchTerm) ||
                (product.description || '').toLowerCase().includes(searchTerm) ||
                (product.supplierName || '').toLowerCase().includes(searchTerm)
            );
            const container = document.getElementById('productsTableBody');
            if (!container) return;
            
            if (filtered.length === 0) {
                container.innerHTML = `<tr><td colspan="7" class="supplier-empty-state" style="text-align:center;padding:18px;"><i class="fas fa-inbox" style="margin-right:6px;"></i>No products found. Click "Add Product" to create your first product.</td></tr>`;
                return;
            }
            
            container.innerHTML = filtered.map(product => `
                <tr>
                    <td class="supplier-id-cell">${escapeHtml(product.id || '-')}</td>
                    <td>
                        <div class="supplier-primary-text">${escapeHtml(product.name)}</div>
                        ${product.supplierName ? `<div class="supplier-secondary-text">Supplier: ${escapeHtml(product.supplierName)}</div>` : ''}
                    </td>
                    <td>${escapeHtml(product.description || '-')}</td>
                    <td>${formatCurrencyPlain(product.price || 0)}</td>
                    <td>${parseFloat(product.tax || 0).toFixed(1)}%</td>
                    <td style="text-align:center;">
                        ${product.vatIncluded
                            ? '<span style="display:inline-flex;align-items:center;gap:4px;color:#166534;font-size:12px;font-weight:600;"><i class=\"fas fa-check-circle\"></i> Yes</span>'
                            : '<span style="color:#9ca3af;font-size:12px;">No</span>'
                        }
                    </td>
                    <td>
                        <div style="display:flex;gap:5px;flex-wrap:wrap;">
                            <button onclick="editProduct('${product.id}')" class="supplier-action-btn supplier-action-btn--edit">Edit</button>
                            <button onclick="printProduct('${product.id}')" class="supplier-action-btn">Print</button>
                            <button onclick="deleteProduct('${product.id}')" class="supplier-action-btn supplier-action-btn--delete">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function printProduct(id) {
            const product = savedProducts.find(p => String(p.id) === String(id));
            if (!product) return;
            const businessName = escapeHtml(document.getElementById('businessName')?.value || localStorage.getItem('businessName') || 'Business');
            const w = window.open('', '_blank', 'width=700,height=600');
            if (!w) {
                alert('Unable to open print window. Please allow pop-ups for this site.');
                return;
            }
            w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Product - ${escapeHtml(product.name)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  th { background: #f9fafb; font-weight: 600; color: #374151; }
  .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
  .value { font-size: 15px; font-weight: 500; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${businessName}</h1>
<div class="meta">Product Details</div>
<table>
  <tr><th class="label">Product ID</th><td class="value">${escapeHtml(product.id || '-')}</td></tr>
  <tr><th class="label">Name</th><td class="value">${escapeHtml(product.name)}</td></tr>
  <tr><th class="label">Description</th><td class="value">${escapeHtml(product.description || '-')}</td></tr>
  <tr><th class="label">Unit Price</th><td class="value">${formatCurrencyPlain(product.price || 0)}</td></tr>
  <tr><th class="label">VAT %</th><td class="value">${parseFloat(product.tax || 0).toFixed(1)}%</td></tr>
  <tr><th class="label">VAT Included</th><td class="value">${product.vatIncluded ? 'Yes' : 'No'}</td></tr>
  <tr><th class="label">Cost</th><td class="value">${formatCurrencyPlain(product.cost || 0)}</td></tr>
  <tr><th class="label">Supplier</th><td class="value">${escapeHtml(product.supplierName || '-')}</td></tr>
</table>
<script>window.onload=function(){window.print();window.close();}<\/script>
</body></html>`);
            w.document.close();
        }

        async function deleteProduct(id) {
            try {
                if (!confirm('Are you sure you want to delete this product/service? This action cannot be undone.')) return;
                const productName = savedProducts.find(p => p.id === id)?.name || 'Product';
                if (isApiEnabled()) {
                    await window.APIClient.postData('deleteProduct', { id: id });
                    await syncProductsFromApi();
                } else {
                    savedProducts = savedProducts.filter(p => p.id !== id);
                    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
                }
                updateSavedProductsDatalist();
                renderProducts();
                refreshSupplierCardsIfVisible();
                console.log(`Product "${productName}" deleted successfully`);
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Error deleting product. Please try again.');
            }
        }

        function getPrintableInvoiceMarkup() {
            const preview = document.getElementById('invoicePreview');
            if (!preview) return '';
            const clone = preview.cloneNode(true);
            clone.querySelectorAll('canvas').forEach(canvas => {
                const image = document.createElement('img');
                image.src = canvas.toDataURL('image/png');
                image.alt = 'Invoice QR Code';
                image.style.width = '100%';
                image.style.height = '100%';
                image.style.objectFit = 'contain';
                canvas.replaceWith(image);
            });
            return clone.innerHTML;
        }

        function printInvoice() {
            updatePreview();
            const printContent = getPrintableInvoiceMarkup();
            if (!printContent) return;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Invoice</title>
                        <style>
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                margin: 0;
                                padding: 20px;
                                color: #1a1a2e;
                                background: white;
                            }
                            .invoice-wrapper {
                                max-width: none;
                                margin: 0;
                                background: white;
                                border-radius: 0;
                                box-shadow: none;
                                padding: 0;
                            }
                            .invoice-card {
                                background: white;
                                border-radius: 0;
                                box-shadow: none;
                                padding: 20px;
                                margin-bottom: 20px;
                                border: none;
                            }
                            .invoice-card-header {
                                display: flex;
                                justify-content: space-between;
                                gap: 20px;
                                align-items: flex-start;
                                margin-bottom: 28px;
                                flex-wrap: wrap;
                            }
                            .invoice-company-name {
                                font-size: 28px;
                                font-weight: 700;
                                margin-bottom: 10px;
                            }
                            .invoice-type {
                                font-size: 32px;
                                font-weight: 700;
                                margin-bottom: 12px;
                            }
                            .invoice-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            .invoice-table th,
                            .invoice-table td {
                                padding: 12px;
                                border-bottom: 1px solid #e0e0e0;
                                text-align: left;
                            }
                            .invoice-table th {
                                background: #f7f8fb;
                                font-weight: 600;
                            }
                            .invoice-summary-block {
                                background: #f7f8fb;
                                border-radius: 8px;
                                padding: 20px;
                                margin-top: 20px;
                            }
                            .summary-row {
                                display: flex;
                                justify-content: space-between;
                                padding: 8px 0;
                                font-size: 14px;
                            }
                            .summary-row--total {
                                font-weight: 700;
                                border-top: 1px solid #e0e0e0;
                                margin-top: 10px;
                                padding-top: 12px;
                            }
                            .invoice-qr {
                                width: 150px;
                                height: 150px;
                                margin: 0 auto;
                            }
                            .invoice-qr canvas,
                            .invoice-qr img {
                                width: 100%;
                                height: 100%;
                                object-fit: contain;
                            }
                            @media print {
                                body { margin: 0; padding: 10px; }
                                .invoice-wrapper { page-break-inside: avoid; }
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }

        function downloadPDF() {
            const element = document.getElementById('invoicePreview');
            const invoiceNo = document.getElementById('invoiceNoDisplay')?.value || 'invoice';
            const opt = {
                margin: 0.5,
                filename: `${invoiceNo}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: {
                    unit: 'in',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                }
            };
            html2pdf().set(opt).from(element).save();
        }

        function setCurrentDate() {
            const dateEl = document.getElementById('currentDate');
            if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        function logout() {
            if (!confirm('Logout?')) return;
            sessionStorage.removeItem(AUTH_SESSION_KEY);
            location.reload();
        }

        function closeCustomerModal() { document.getElementById('customerModal').style.display = 'none'; }
        function closeEmployeeModal() { document.getElementById('employeeModal').style.display = 'none'; }
        function closeContactModal() { document.getElementById('contactHistoryModal').style.display = 'none'; }
        function closeOrderModal() { document.getElementById('orderHistoryModal').style.display = 'none'; }
        function closeQRModal() { document.getElementById('qrModal').style.display = 'none'; }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                return m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;';
            });
        }

        function exportCustomers() {
            const ws = XLSX.utils.json_to_sheet(customers.map(c => ({ Name: c.name, Phone: c.phone, Email: c.email, Company: c.company, Tag: c.tag, 'Total Spent': c.totalSpent })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Customers');
            XLSX.writeFile(wb, `customers_${new Date().toISOString().split('T')[0]}.xlsx`);
}

const input = document.getElementById("companyAddress");
  const output = document.getElementById("output");

  input.addEventListener("input", () => {
    output.innerHTML = input.value;
  });

        // Missing contact modal functions
        function sendWhatsAppToCustomer() {
            const customer = window.currentContactCustomer;
            if (customer && customer.phone) {
                const message = `Hello ${customer.name}, I have some information for you!`;
                const url = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            } else {
                alert('No phone number available');
            }
        }

        function sendEmailToCustomer() {
            const customer = window.currentContactCustomer;
            if (customer && customer.email) {
                window.location.href = `mailto:${customer.email}?subject=Important Update`;
            } else {
                alert('No email address available');
            }
        }

        // Load dark mode preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }