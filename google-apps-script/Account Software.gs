// ==================== UNIFIED ACCOUNTING SYSTEM BACKEND ====================
// Single file: handles ALL actions — CRM, HR, Invoices, Products, Settings, etc.
// Spreadsheet ID
const ACCOUNT_SOFTWARE_SPREADSHEET_ID = '1okpAP9AlmmKai3jn5SfjzGuuLcW1eS4vAbMZSjyD5u0';
const ACCOUNT_SOFTWARE_DEFAULT_LOGO_DRIVE_FOLDER_ID = '1Lo5LEH2IUa5flRpmA11C8Y5DbU4d6u9l';

// Sheet name aliases (for legacy compatibility)
const SHEET_NAME_ALIASES = {
  Tasks: 'Task',
  Task: 'Task',
  SupplierPurchases: 'Supplierpurchases',
  Supplierpurchases: 'Supplierpurchases',
  Qutations: 'Qutations',
  Settings: 'Settings',
  HR: 'HR',
  Dashboard: 'Dashboard',
  CustomerContacts: 'CustomerContacts',
  Admin: 'Admin'
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const action = payload.action;
    ensureRequiredSheets_();

    // ---- Ping / Health check ----
    if (action === 'ping' || action === 'healthCheck' || action === 'health_check') {
      return jsonOut({ success: true, message: 'API is online', data: { pong: true, timestamp: new Date().toISOString() } });
    }

    // ---- Customers ----
    if (action === 'getCustomers') {
      return jsonOut({ success: true, message: 'OK', data: getCustomers_(payload.filters || {}) });
    }
    if (action === 'addCustomer') {
      return jsonOut(addCustomer_(payload.customer || payload));
    }
    if (action === 'updateCustomer') {
      const id = (payload.customer && payload.customer.id) || payload.customer_id || payload.id;
      return jsonOut(updateCustomer_(id, payload.customer || payload));
    }
    if (action === 'deleteCustomer') {
      return jsonOut(deleteRowGeneric_('Customers', payload.customer_id || payload.id));
    }
    if (action === 'getCustomerById') {
      return jsonOut({ success: true, message: 'OK', data: getCustomerById_(payload.customer_id || payload.id) });
    }

    // ---- Suppliers ----
    if (action === 'getSuppliers') {
      return jsonOut({ success: true, message: 'OK', data: getSuppliers_(payload.filters || {}) });
    }
    if (action === 'addSupplier') {
      return jsonOut(addSupplier_(payload.supplier || payload));
    }
    if (action === 'updateSupplier') {
      const id = (payload.supplier && payload.supplier.id) || payload.supplier_id || payload.id;
      return jsonOut(updateSupplier_(id, payload.supplier || payload));
    }
    if (action === 'deleteSupplier') {
      return jsonOut(deleteRowGeneric_('Suppliers', payload.supplier_id || payload.id));
    }
    if (action === 'getSupplierById') {
      return jsonOut({ success: true, message: 'OK', data: getSupplierById_(payload.supplier_id || payload.id) });
    }

    // ---- Customer Transactions ----
    if (action === 'getCustomerTransactions') {
      return jsonOut({ success: true, message: 'OK', data: getCustomerTransactions_(payload.customer_id || payload.id) });
    }
    if (action === 'addCustomerTransaction') {
      return jsonOut(addCustomerTransaction_(payload.transaction || payload));
    }

    // ---- Supplier Transactions ----
    if (action === 'getSupplierTransactions') {
      return jsonOut({ success: true, message: 'OK', data: getSupplierTransactions_(payload.supplier_id || payload.id) });
    }
    if (action === 'addSupplierTransaction') {
      return jsonOut(addSupplierTransaction_(payload.transaction || payload));
    }

    // ---- Customer Contacts ----
    if (action === 'getCustomerContacts') {
      return jsonOut({ success: true, message: 'OK', data: getCustomerContactsRecords(payload.customer_id) });
    }
    if (action === 'addCustomerContact') {
      return jsonOut(addCustomerContactRecord(payload.contact || payload));
    }

    // ---- Assets ----
    if (action === 'uploadCompanyLogo') {
      return jsonOut(uploadCompanyLogo_(payload));
    }
    if (action === 'uploadEmployeeProfilePhoto') {
      return jsonOut(uploadCompanyLogo_(payload));
    }
    if (action === 'resolveDriveFolderLogo') {
      return jsonOut(resolveDriveFolderLogo_(payload));
    }

    // ---- Invoices ----
    if (action === 'getInvoices') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Invoices') });
    }
    if (action === 'addInvoice') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Invoices', payload.invoice, H_.INVOICES) });
    }
    if (action === 'updateInvoice') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Invoices', payload.invoice, H_.INVOICES) });
    }
    if (action === 'deleteInvoice') {
      return jsonOut(deleteRowGeneric_('Invoices', payload.id));
    }

    // ---- Quotations ----
    if (action === 'getQuotations') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Qutations') });
    }
    if (action === 'addQuotation') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Qutations', payload.quotation, H_.QUOTATIONS) });
    }
    if (action === 'updateQuotation') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Qutations', payload.quotation, H_.QUOTATIONS) });
    }
    if (action === 'deleteQuotation') {
      return jsonOut(deleteRowGeneric_('Qutations', payload.id));
    }

    // ---- Products ----
    if (action === 'getProducts') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Products & Services') });
    }
    if (action === 'addProduct') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Products & Services', payload.product, H_.PRODUCTS) });
    }
    if (action === 'updateProduct') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Products & Services', payload.product, H_.PRODUCTS) });
    }
    if (action === 'deleteProduct') {
      return jsonOut(deleteRowGeneric_('Products & Services', payload.id));
    }

    // ---- Expenses ----
    if (action === 'getExpenses') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Expenses') });
    }
    if (action === 'addExpense') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Expenses', payload.expense, H_.EXPENSES) });
    }
    if (action === 'updateExpense') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Expenses', payload.expense, H_.EXPENSES) });
    }
    if (action === 'deleteExpense') {
      return jsonOut(deleteRowGeneric_('Expenses', payload.id));
    }

    // ---- Supplier Purchases ----
    if (action === 'getSupplierPurchases') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Supplierpurchases') });
    }
    if (action === 'addSupplierPurchase') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Supplierpurchases', payload.purchase, H_.SUPPLIER_PURCHASES) });
    }
    if (action === 'updateSupplierPurchase') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Supplierpurchases', payload.purchase, H_.SUPPLIER_PURCHASES) });
    }
    if (action === 'deleteSupplierPurchase') {
      return jsonOut(deleteRowGeneric_('Supplierpurchases', payload.id));
    }

    // ---- Supplier Payments ----
    if (action === 'getSupplierPayments') {
      return jsonOut({ success: true, message: 'OK', data: readAll('SupplierPayments') });
    }
    if (action === 'addSupplierPayment') {
      return jsonOut({ success: true, message: 'OK', data: addRow('SupplierPayments', payload.payment, H_.SUPPLIER_PAYMENTS) });
    }

    // ---- HR: Employees ----
    if (action === 'getEmployees') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Employees') });
    }
    if (action === 'addEmployee') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Employees', payload.employee, H_.EMPLOYEES) });
    }
    if (action === 'updateEmployee') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Employees', payload.employee, H_.EMPLOYEES) });
    }
    if (action === 'deleteEmployee') {
      return jsonOut(deleteRowGeneric_('Employees', payload.id));
    }

    // ---- HR: Attendance ----
    if (action === 'getAttendance') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Attendance') });
    }
    if (action === 'addAttendance') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Attendance', payload.attendance, H_.ATTENDANCE) });
    }
    if (action === 'updateAttendance') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Attendance', payload.attendance, H_.ATTENDANCE) });
    }
    if (action === 'deleteAttendance') {
      return jsonOut(deleteRowGeneric_('Attendance', payload.id));
    }

    // ---- HR: Leaves ----
    if (action === 'getLeaves') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Leaves') });
    }
    if (action === 'addLeave') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Leaves', payload.leave, H_.LEAVES) });
    }
    if (action === 'updateLeave') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Leaves', payload.leave, H_.LEAVES) });
    }
    if (action === 'deleteLeave') {
      return jsonOut(deleteRowGeneric_('Leaves', payload.id));
    }

    // ---- Tasks ----
    if (action === 'getTasks') {
      return jsonOut({ success: true, message: 'OK', data: readAll('Task') });
    }
    if (action === 'addTask') {
      return jsonOut({ success: true, message: 'OK', data: addRow('Task', payload.task, H_.TASKS) });
    }
    if (action === 'updateTask') {
      return jsonOut({ success: true, message: 'OK', data: updateRowById('Task', payload.task, H_.TASKS) });
    }

    // ---- Settings ----
    if (action === 'getSettings') {
      return jsonOut({ success: true, message: 'OK', data: getSettingsRecords() });
    }
    if (action === 'getAllSettings') {
      return jsonOut({ success: true, message: 'OK', data: getSettingsRecords() });
    }
    if (action === 'getSettingByKey') {
      return jsonOut({ success: true, message: 'OK', data: getSettingByKey_(payload.key) });
    }
    if (action === 'upsertSetting') {
      return jsonOut({ success: true, message: 'OK', data: upsertSettingRecord(payload.key, payload.value) });
    }
    if (action === 'saveSetting') {
      return jsonOut({ success: true, message: 'OK', data: upsertSettingRecord(payload.key, payload.value) });
    }
    if (action === 'upsertSettings') {
      return jsonOut({ success: true, message: 'OK', data: upsertSettingsMap(payload.settings || {}) });
    }
    if (action === 'saveSettings') {
      return jsonOut({ success: true, message: 'OK', data: upsertSettingsMap(payload.settings || {}) });
    }
    if (action === 'deleteSetting') {
      return jsonOut({ success: true, message: 'OK', data: deleteSettingRecord(payload.key) });
    }
    if (action === 'setupSettingsManagementTemplate') {
      return jsonOut(setupSettingsManagementTemplate_());
    }
    if (action === 'setupSettingsManagementSystemTemplate') {
      return jsonOut(setupSettingsManagementTemplate_());
    }

    // ---- HR Template ----
    if (action === 'setupHRManagementTemplate') {
      return jsonOut(setupHRManagementTemplate_());
    }
    if (action === 'setupHRManagementSystemTemplate') {
      return jsonOut(setupHRManagementTemplate_());
    }
    if (action === 'setupAdminManagementTemplate' || action === 'setupAdminManagementSystemTemplate') {
      return jsonOut(setupAdminManagementTemplate_());
    }
    if (action === 'setupCustomerManagementTemplate' || action === 'setupCustomerManagementSystemTemplate') {
      return jsonOut(setupCustomerManagementTemplate_());
    }
    if (action === 'setupSupplierManagementTemplate' || action === 'setupSupplierManagementSystemTemplate') {
      return jsonOut(setupSupplierManagementTemplate_());
    }
    if (action === 'setupInvoiceManagementTemplate' || action === 'setupInvoiceManagementSystemTemplate') {
      return jsonOut(setupInvoiceManagementTemplate_());
    }
    if (action === 'setupProductManagementTemplate' || action === 'setupProductManagementSystemTemplate') {
      return jsonOut(setupProductManagementTemplate_());
    }
    if (action === 'setupEmployeeManagementTemplate' || action === 'setupEmployeeManagementSystemTemplate') {
      return jsonOut(setupEmployeeManagementTemplate_());
    }
    if (action === 'setupExpenseManagementTemplate' || action === 'setupExpenseManagementSystemTemplate') {
      return jsonOut(setupExpenseManagementTemplate_());
    }
    if (action === 'setupQuotationManagementTemplate' || action === 'setupQuotationManagementSystemTemplate') {
      return jsonOut(setupQuotationManagementTemplate_());
    }
    if (action === 'setupTasksManagementTemplate' || action === 'setupTasksManagementSystemTemplate') {
      return jsonOut(setupTasksManagementTemplate_());
    }
    if (action === 'setupAllManagementTemplates' || action === 'setupAllManagementSystemTemplates') {
      return jsonOut(setupAllManagementTemplates_());
    }
    if (action === 'getHRRecords') {
      return jsonOut({ success: true, message: 'OK', data: getHRRecords_() });
    }
    if (action === 'getHRRecordById') {
      return jsonOut({ success: true, message: 'OK', data: getHRRecordById_(payload.id || payload.hr_id) });
    }
    if (action === 'upsertHRRecord') {
      return jsonOut(upsertHRRecord_(payload.hr || payload));
    }
    if (action === 'deleteHRRecord') {
      return jsonOut(deleteHRRecord_(payload.id || payload.hr_id));
    }

    // ---- Dashboard ----
    if (action === 'getDashboard') {
      return jsonOut({ success: true, message: 'OK', data: getDashboardRecords() });
    }
    if (action === 'upsertDashboard') {
      return jsonOut({ success: true, message: 'OK', data: upsertDashboardMetrics(payload.metrics || {}) });
    }

    // ---- Admin ----
    if (action === 'verifyAdmin') {
      return jsonOut({ success: true, message: 'OK', data: verifyAdminCredentials(payload.username, payload.password) });
    }
    if (action === 'upsertAdmin') {
      return jsonOut({ success: true, message: 'OK', data: upsertAdminUser(payload.admin || payload) });
    }

    // ---- Analytics ----
    if (action === 'getCustomerStatistics') {
      return jsonOut({ success: true, message: 'OK', data: getCustomerStatistics_() });
    }
    if (action === 'getSupplierStatistics') {
      return jsonOut({ success: true, message: 'OK', data: getSupplierStatistics_() });
    }

    return jsonOut({ success: false, message: 'Unknown action: ' + action, data: [] });
  } catch (err) {
    return jsonOut({ success: false, message: formatApiErrorMessage_(err), data: [] });
  }
}

// ==================== HEADER SCHEMAS ====================
// Single source of truth for all sheet column headers
const H_ = {
  CUSTOMERS: ['id', 'name', 'phone', 'email', 'company', 'vat', 'address', 'tag', 'credit_limit', 'payment_terms', 'opening_balance', 'opening_balance_type', 'closing_balance', 'closing_balance_type', 'total_purchase', 'total_paid', 'due_amount', 'status', 'customer_type', 'created_date', 'last_payment_date', 'last_contact', 'notes'],
  SUPPLIERS: ['id', 'name', 'phone', 'email', 'company', 'vat', 'address', 'payment_terms', 'bank_details', 'contact_person', 'status', 'notes', 'opening_balance', 'opening_balance_type', 'total_purchase', 'total_paid', 'due_amount', 'last_purchase_date'],
  INVOICES: ['id', 'invoice_no', 'customer_id', 'customer_name', 'date', 'due_date', 'subtotal', 'total', 'vat', 'discount', 'shipping', 'advance_payment', 'amount_due', 'currency', 'status', 'items'],
  QUOTATIONS: ['id', 'quotation_no', 'customer_id', 'customer_name', 'date', 'subtotal', 'total', 'vat', 'discount', 'status', 'items'],
  PRODUCTS: ['id', 'name', 'description', 'price', 'vat', 'supplier_id', 'supplier_name', 'cost', 'vat_included', 'dont_update_qty'],
  EXPENSES: ['id', 'date', 'category', 'description', 'amount'],
  SUPPLIER_PURCHASES: ['id', 'supplier_id', 'product_name', 'quantity', 'unit_price', 'total', 'vat_amount', 'vat_rate', 'paid_amount', 'due_amount', 'purchase_date', 'due_date', 'status', 'notes'],
  SUPPLIER_PAYMENTS: ['id', 'supplier_id', 'purchase_id', 'voucher_no', 'amount', 'payment_date', 'payment_method', 'notes'],
  EMPLOYEES: ['id', 'name', 'role', 'department', 'salary', 'email', 'mobile', 'home_address', 'website', 'profile_photo'],
  ATTENDANCE: ['id', 'employee_id', 'date', 'status'],
  LEAVES: ['id', 'employee_id', 'type', 'from_date', 'to_date', 'status'],
  HR: ['id', 'employee_id', 'employee_name', 'department', 'designation', 'employment_type', 'email', 'phone', 'join_date', 'basic_salary', 'status', 'notes', 'updated_at'],
  TASKS: ['id', 'title', 'priority', 'status'],
  CUSTOMER_TRANSACTIONS: ['id', 'customer_id', 'type', 'amount', 'date', 'invoice_id', 'note', 'created_date'],
  SUPPLIER_TRANSACTIONS: ['id', 'supplier_id', 'type', 'amount', 'date', 'purchase_id', 'note', 'created_date'],
  CUSTOMER_CONTACTS: ['id', 'customer_id', 'type', 'message', 'date', 'created_date']
};

// ==================== INITIALIZATION ====================
function myFunction() {
  ensureRequiredSheets_();
  return { success: true, message: 'Initialization completed' };
}

function doGet(e) {
  const callback = sanitizeJsonpCallback_((e && e.parameter && e.parameter.callback) || '');
  const rawPayload = String((e && e.parameter && (e.parameter.payload || e.parameter.p)) || '').trim();

  if (rawPayload) {
    let payload = {};
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      return outputMaybeJsonp_({ success: false, message: 'Invalid payload JSON', data: [] }, callback);
    }

    try {
      const postResponse = doPost({ postData: { contents: JSON.stringify(payload) } });
      const raw = String(postResponse.getContent() || '{}');
      let responseObj;
      try {
        responseObj = JSON.parse(raw);
      } catch (parseError) {
        responseObj = { success: false, message: 'Invalid API response format', data: [] };
      }
      return outputMaybeJsonp_(responseObj, callback);
    } catch (error) {
      return outputMaybeJsonp_({ success: false, message: formatApiErrorMessage_(error), data: [] }, callback);
    }
  }

  return outputMaybeJsonp_({ success: true, message: 'API is online', data: [], storage: 'Google Sheets' }, callback);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(ACCOUNT_SOFTWARE_SPREADSHEET_ID);
}

function ensureRequiredSheets_() {
  [
    'Customers', 'Suppliers', 'Products & Services', 'Invoices', 'Expenses',
    'Qutations', 'Employees', 'Attendance', 'Leaves', 'Task', 'Supplierpurchases',
    'SupplierPayments', 'HR', 'CustomerTransactions', 'SupplierTransactions',
    'CustomerContacts', 'Settings', 'Dashboard', 'Admin'
  ].forEach(name => getSheet(name));
}

// ==================== CUSTOMER BUSINESS LOGIC ====================
function getNextCustomerNumericId_() {
  const baseStart = 2000;
  const sh = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  let max = baseStart;
  for (let i = 1; i < data.length; i++) {
    const m = String(data[i][0] || '').match(/^CUST-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max + 1;
}

function getCustomers_(filters) {
  const headers = getSafeHeaders_(H_.CUSTOMERS);
  const sh = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const results = [];
  for (let i = 1; i < data.length; i++) {
    if (!String(data[i][0]).trim()) continue;
    const c = rowToObject(headers, data[i]);
    if (filters.tag && c.tag !== filters.tag) continue;
    if (filters.status && c.status !== filters.status) continue;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!String(c.name || '').toLowerCase().includes(s) &&
          !String(c.email || '').toLowerCase().includes(s) &&
          !String(c.phone || '').includes(s)) continue;
    }
    results.push(c);
  }
  return results;
}

function getCustomerById_(customerId) {
  const headers = getSafeHeaders_(H_.CUSTOMERS);
  const data = getSheet('Customers').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(customerId)) return rowToObject(headers, data[i]);
  }
  return null;
}

function addCustomer_(customerData) {
  const headers = H_.CUSTOMERS;
  const id = `CUST-${getNextCustomerNumericId_()}`;
  const openingBalance = Number(customerData.opening_balance || 0);
  const totalPurchase = Number(customerData.total_purchase || 0);
  const totalPaid = Number(customerData.total_paid || 0);
  const dueAmount = Number(customerData.due_amount != null ? customerData.due_amount : (customerData.due != null ? customerData.due : openingBalance));
  const rec = {
    id, name: customerData.name || '', phone: customerData.phone || '',
    email: customerData.email || '', company: customerData.company || '',
    vat: customerData.vat || '', address: customerData.address || '',
    tag: customerData.tag || 'New', credit_limit: customerData.credit_limit || 0,
    payment_terms: customerData.payment_terms || 30,
    opening_balance: openingBalance,
    opening_balance_type: customerData.opening_balance_type || 'Dr',
    closing_balance: Number(customerData.closing_balance || 0),
    closing_balance_type: customerData.closing_balance_type || 'Dr',
    total_purchase: totalPurchase,
    total_paid: totalPaid,
    due_amount: dueAmount,
    status: customerData.status || 'Active',
    customer_type: customerData.customer_type || 'Individual',
    created_date: new Date().toISOString(),
    last_payment_date: customerData.last_payment_date || '',
    last_contact: customerData.last_contact || '',
    notes: customerData.notes || ''
  };
  getSheet('Customers').appendRow(headers.map(h => rec[h] !== undefined ? rec[h] : ''));
  return { success: true, message: 'Customer added successfully', data: rec };
}

function updateCustomer_(customerId, customerData) {
  const headers = getSafeHeaders_(H_.CUSTOMERS);
  const sh = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(customerId)) {
      const current = rowToObject(headers, data[i]);
      const updated = Object.assign({}, current, customerData);
      if ((updated.due_amount === undefined || updated.due_amount === '') && updated.due !== undefined) {
        updated.due_amount = updated.due;
      }
      const ob = updated.opening_balance_type === 'Dr' ? (updated.opening_balance || 0) : -(updated.opening_balance || 0);
      updated.due_amount = Math.max(0, ob + (updated.total_purchase || 0) - (updated.total_paid || 0));
      sh.getRange(i + 1, 1, 1, headers.length).setValues([headers.map(h => updated[h] !== undefined ? updated[h] : '')]);
      return { success: true, message: 'Customer updated', data: updated };
    }
  }
  return { success: false, message: 'Customer not found' };
}

// ---- Customer Transactions ----
function getCustomerTransactions_(customerId) {
  const headers = getSafeHeaders_(H_.CUSTOMER_TRANSACTIONS);
  const sh = getSheet('CustomerTransactions');
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).filter(r => !customerId || String(r[1]) === String(customerId)).map(r => rowToObject(headers, r));
}

function addCustomerTransaction_(txData) {
  const headers = H_.CUSTOMER_TRANSACTIONS;
  const rec = {
    id: generateId_('CTRANS'),
    customer_id: txData.customer_id || '',
    type: txData.type || 'Invoice',
    amount: txData.amount || 0,
    date: txData.date || new Date().toISOString().split('T')[0],
    invoice_id: txData.invoice_id || '',
    note: txData.note || '',
    created_date: new Date().toISOString()
  };
  getSheet('CustomerTransactions').appendRow(headers.map(h => rec[h] !== undefined ? rec[h] : ''));
  updateCustomerFinancials_(rec.customer_id);
  return { success: true, message: 'Transaction recorded', data: rec };
}

function updateCustomerFinancials_(customerId) {
  if (!customerId) return;
  const transactions = getCustomerTransactions_(customerId);
  const customer = getCustomerById_(customerId);
  if (!customer) return;
  let totalPurchase = 0, totalPaid = 0;
  transactions.forEach(t => {
    const a = parseFloat(t.amount) || 0;
    if (t.type === 'Invoice') totalPurchase += a;
    else if (t.type === 'Payment' || t.type === 'Credit Note') totalPaid += a;
  });
  updateCustomer_(customerId, { total_purchase: totalPurchase, total_paid: totalPaid });
}

// ==================== SUPPLIER BUSINESS LOGIC ====================
function getSuppliers_(filters) {
  const headers = getSafeHeaders_(H_.SUPPLIERS);
  const sh = getSheet('Suppliers');
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const results = [];
  for (let i = 1; i < data.length; i++) {
    if (!String(data[i][0]).trim()) continue;
    const s = rowToObject(headers, data[i]);
    if (filters.status && s.status !== filters.status) continue;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!String(s.name || '').toLowerCase().includes(q) &&
          !String(s.email || '').toLowerCase().includes(q) &&
          !String(s.phone || '').includes(q)) continue;
    }
    results.push(s);
  }
  return results;
}

function getSupplierById_(supplierId) {
  const headers = getSafeHeaders_(H_.SUPPLIERS);
  const data = getSheet('Suppliers').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(supplierId)) return rowToObject(headers, data[i]);
  }
  return null;
}

function addSupplier_(supplierData) {
  const headers = H_.SUPPLIERS;
  const id = generateId_('SUP');
  const rec = {
    id, name: supplierData.name || '', phone: supplierData.phone || '',
    email: supplierData.email || '', company: supplierData.company || '',
    vat: supplierData.vat || '', address: supplierData.address || '',
    payment_terms: supplierData.payment_terms || 30,
    bank_details: supplierData.bank_details || '',
    contact_person: supplierData.contact_person || '',
    status: supplierData.status || 'Active',
    notes: supplierData.notes || '',
    opening_balance: supplierData.opening_balance || 0,
    opening_balance_type: supplierData.opening_balance_type || 'Dr',
    total_purchase: 0, total_paid: 0, due_amount: 0,
    last_purchase_date: ''
  };
  getSheet('Suppliers').appendRow(headers.map(h => rec[h] !== undefined ? rec[h] : ''));
  return { success: true, message: 'Supplier added successfully', data: rec };
}

function updateSupplier_(supplierId, supplierData) {
  const headers = getSafeHeaders_(H_.SUPPLIERS);
  const sh = getSheet('Suppliers');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(supplierId)) {
      const current = rowToObject(headers, data[i]);
      const updated = Object.assign({}, current, supplierData);
      updated.due_amount = (updated.total_purchase || 0) - (updated.total_paid || 0);
      sh.getRange(i + 1, 1, 1, headers.length).setValues([headers.map(h => updated[h] !== undefined ? updated[h] : '')]);
      return { success: true, message: 'Supplier updated', data: updated };
    }
  }
  return { success: false, message: 'Supplier not found' };
}

// ---- Supplier Transactions ----
function getSupplierTransactions_(supplierId) {
  const headers = getSafeHeaders_(H_.SUPPLIER_TRANSACTIONS);
  const sh = getSheet('SupplierTransactions');
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).filter(r => !supplierId || String(r[1]) === String(supplierId)).map(r => rowToObject(headers, r));
}

function addSupplierTransaction_(txData) {
  const headers = H_.SUPPLIER_TRANSACTIONS;
  const rec = {
    id: generateId_('STRANS'),
    supplier_id: txData.supplier_id || '',
    type: txData.type || 'Purchase',
    amount: txData.amount || 0,
    date: txData.date || new Date().toISOString().split('T')[0],
    purchase_id: txData.purchase_id || '',
    note: txData.note || '',
    created_date: new Date().toISOString()
  };
  getSheet('SupplierTransactions').appendRow(headers.map(h => rec[h] !== undefined ? rec[h] : ''));
  updateSupplierFinancials_(rec.supplier_id);
  return { success: true, message: 'Transaction recorded', data: rec };
}

function updateSupplierFinancials_(supplierId) {
  if (!supplierId) return;
  const transactions = getSupplierTransactions_(supplierId);
  const supplier = getSupplierById_(supplierId);
  if (!supplier) return;
  let totalPurchase = 0, totalPaid = 0;
  transactions.forEach(t => {
    const a = parseFloat(t.amount) || 0;
    if (t.type === 'Purchase') totalPurchase += a;
    else if (t.type === 'Payment') totalPaid += a;
  });
  updateSupplier_(supplierId, { total_purchase: totalPurchase, total_paid: totalPaid });
}

// ==================== ANALYTICS ====================
function getCustomerStatistics_() {
  const customers = getCustomers_({});
  return {
    total_customers: customers.length,
    active_customers: customers.filter(c => c.status === 'Active').length,
    total_due: customers.reduce((s, c) => s + (parseFloat(c.due_amount) || 0), 0),
    total_purchase: customers.reduce((s, c) => s + (parseFloat(c.total_purchase) || 0), 0),
    total_paid: customers.reduce((s, c) => s + (parseFloat(c.total_paid) || 0), 0)
  };
}

function getSupplierStatistics_() {
  const suppliers = getSuppliers_({});
  return {
    total_suppliers: suppliers.length,
    active_suppliers: suppliers.filter(s => s.status === 'Active').length,
    total_due: suppliers.reduce((s, x) => s + (parseFloat(x.due_amount) || 0), 0),
    total_purchase: suppliers.reduce((s, x) => s + (parseFloat(x.total_purchase) || 0), 0),
    total_paid: suppliers.reduce((s, x) => s + (parseFloat(x.total_paid) || 0), 0)
  };
}

// ==================== GENERIC HELPERS ====================
function deleteRowGeneric_(sheetName, id) {
  return { success: true, data: deleteRowById(sheetName, id) };
}

function generateId_(prefix) {
  const ts = Date.now().toString().slice(-8);
  const rnd = Math.random().toString(36).substring(2, 6);
  return (prefix + '-' + ts + rnd).toUpperCase();
}

function readAll(sheetName) {
  const sh = getSheet(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(r => String(r[0]).trim() !== "").map(r => rowToObject(headers, r));
}

function addRow(sheetName, data, columns) {
  const sh = getSheet(sheetName);
  const normalized = normalizeData(data || {}, columns);
  if (!normalized.id) normalized.id = String(new Date().getTime());
  sh.appendRow(columns.map(c => normalized[c] || ""));
  return normalized;
}

function updateRowById(sheetName, data, columns) {
  const sh = getSheet(sheetName);
  const id = String((data && data.id) || "");
  if (!id) throw new Error("Missing id for update");

  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error("No data rows found");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      const normalized = normalizeData(data || {}, columns);
      sh.getRange(i + 1, 1, 1, columns.length).setValues([columns.map(c => normalized[c] || "")]);
      return normalized;
    }
  }

  throw new Error("Record not found for id: " + id);
}

function deleteRowById(sheetName, idInput) {
  const sh = getSheet(sheetName);
  const id = String(idInput || "");
  if (!id) throw new Error("Missing id for delete");

  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error("No data rows found");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      sh.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }

  throw new Error("Record not found for id: " + id);
}

function normalizeData(data, columns) {
  const out = {};
  columns.forEach(c => out[c] = data[c] !== undefined ? data[c] : "");
  return out;
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    obj[String(headers[i])] = row[i];
  }
  return obj;
}

function getSheet(name) {
  const ss = getSpreadsheet();
  const resolvedName = resolveSheetName(name);
  let sh = ss.getSheetByName(resolvedName);
  const headers = getHeadersForSheet(resolvedName);
  if (!sh) {
    sh = ss.insertSheet(resolvedName);
    initializeHeaders(sh, resolvedName);
  } else {
    ensureHeaders(sh, headers);
  }
  if (resolvedName === 'Admin') {
    ensureAdminDefaults_(sh);
  }
  return sh;
}

function initializeHeaders(sh, name) {
  const headers = getSafeHeaders_(getHeadersForSheet(name));
  ensureColumnCapacity_(sh, headers.length);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function resolveSheetName(name) {
  return SHEET_NAME_ALIASES[name] || name;
}

function getHeadersForSheet(name) {
  const map = {
    Employees: H_.EMPLOYEES,
    Attendance: H_.ATTENDANCE,
    Leaves: H_.LEAVES,
    HR: H_.HR,
    Task: H_.TASKS,
    Suppliers: H_.SUPPLIERS,
    Customers: H_.CUSTOMERS,
    CustomerContacts: H_.CUSTOMER_CONTACTS,
    CustomerTransactions: H_.CUSTOMER_TRANSACTIONS,
    SupplierTransactions: H_.SUPPLIER_TRANSACTIONS,
    Invoices: H_.INVOICES,
    'Products & Services': H_.PRODUCTS,
    Expenses: H_.EXPENSES,
    Supplierpurchases: H_.SUPPLIER_PURCHASES,
    SupplierPayments: H_.SUPPLIER_PAYMENTS,
    Qutations: H_.QUOTATIONS,
    Settings: ['id', 'key', 'value', 'updated_at'],
    Dashboard: ['id', 'metric', 'value', 'updated_at'],
    Admin: ['id', 'username', 'password', 'name', 'role', 'status', 'updated_at']
  };
  return map[name] || ['id'];
}

function getSettingsRecords() {
  return readAll('Settings');
}

function getSettingByKey_(key) {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return null;
  const rows = readAll('Settings');
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].key || '').trim() === normalizedKey) return rows[i];
  }
  return null;
}

function upsertSettingRecord(key, value) {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) throw new Error('Missing settings key');
  const id = `SET-${normalizedKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const row = {
    id,
    key: normalizedKey,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    updated_at: new Date().toISOString()
  };
  try {
    return updateRowById('Settings', row, getHeadersForSheet('Settings'));
  } catch (error) {
    return addRow('Settings', row, getHeadersForSheet('Settings'));
  }
}

function upsertSettingsMap(settings) {
  const result = [];
  Object.keys(settings || {}).forEach(key => {
    result.push(upsertSettingRecord(key, settings[key]));
  });
  return result;
}

function deleteSettingRecord(key) {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) throw new Error('Missing settings key');
  const id = `SET-${normalizedKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return deleteRowById('Settings', id);
}

function uploadCompanyLogo_(payload) {
  const folderId = String(payload.folderId || payload.folder_id || ACCOUNT_SOFTWARE_DEFAULT_LOGO_DRIVE_FOLDER_ID || '').trim();
  const dataUrl = String(payload.dataUrl || payload.data_url || payload.base64 || '').trim();
  const fileName = String(payload.fileName || payload.file_name || `company-logo-${Date.now()}.png`).trim();

  if (!folderId) {
    throw new Error('Missing Google Drive folder id for logo upload');
  }
  if (!dataUrl) {
    throw new Error('Missing logo image data');
  }

  const parsed = parseDataUrl_(dataUrl);
  const folder = DriveApp.getFolderById(folderId);
  const ext = getFileExtensionFromMime_(parsed.mimeType);
  const safeName = fileName.replace(/\.[A-Za-z0-9]+$/, '');
  const blob = Utilities.newBlob(parsed.bytes, parsed.mimeType, `${safeName}.${ext}`);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    // Keep file creation successful even if sharing policy blocks public access.
  }

  return {
    success: true,
    message: 'Company logo uploaded successfully',
    data: {
      file_id: file.getId(),
      file_name: file.getName(),
      folder_id: folderId,
      web_url: file.getUrl(),
      direct_url: `https://drive.google.com/uc?export=view&id=${file.getId()}`
    }
  };
}

function resolveDriveFolderLogo_(payload) {
  const rawFolder = payload.folderId || payload.folder_id || payload.folderLink || payload.folder_link || '';
  const folderId = extractDriveFolderId_(rawFolder) || ACCOUNT_SOFTWARE_DEFAULT_LOGO_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('Missing Google Drive folder id');
  }

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  let selected = null;

  while (files.hasNext()) {
    const file = files.next();
    const mime = String(file.getMimeType() || '').toLowerCase();
    if (mime.indexOf('image/') === 0) {
      selected = file;
      break;
    }
  }

  if (!selected) {
    throw new Error('No image file found in the selected Drive folder');
  }

  try {
    selected.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    // Keep resolution successful even if sharing policy blocks public access.
  }

  return {
    success: true,
    message: 'Drive folder logo resolved successfully',
    data: {
      file_id: selected.getId(),
      file_name: selected.getName(),
      folder_id: folderId,
      web_url: selected.getUrl(),
      direct_url: `https://drive.google.com/thumbnail?id=${selected.getId()}&sz=w1000`,
      download_url: `https://drive.google.com/uc?export=view&id=${selected.getId()}`
    }
  };
}

function setupSettingsManagementTemplate_() {
  const sheet = getSheet('Settings');
  const headers = getHeadersForSheet('Settings');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Settings Management Template is ready',
    data: { sheet_name: 'Settings', headers: headers }
  };
}

function setupAdminManagementTemplate_() {
  const sheet = getSheet('Admin');
  const headers = getHeadersForSheet('Admin');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Admin Management Template is ready',
    data: { sheet_name: 'Admin', headers: headers }
  };
}

function setupCustomerManagementTemplate_() {
  const sheets = ['Customers', 'CustomerTransactions', 'CustomerContacts'];
  const result = [];
  sheets.forEach(name => {
    const sh = getSheet(name);
    const headers = getHeadersForSheet(name);
    ensureHeaders(sh, headers);
    result.push({ sheet_name: name, headers: headers });
  });
  return {
    success: true,
    message: 'Customer Management Template is ready',
    data: result
  };
}

function setupSupplierManagementTemplate_() {
  const sheets = ['Suppliers', 'Supplierpurchases', 'SupplierPayments', 'SupplierTransactions'];
  const result = [];
  sheets.forEach(name => {
    const sh = getSheet(name);
    const headers = getHeadersForSheet(name);
    ensureHeaders(sh, headers);
    result.push({ sheet_name: name, headers: headers });
  });
  return {
    success: true,
    message: 'Supplier Management Template is ready',
    data: result
  };
}

function setupInvoiceManagementTemplate_() {
  const sheet = getSheet('Invoices');
  const headers = getHeadersForSheet('Invoices');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Invoice Management Template is ready',
    data: { sheet_name: 'Invoices', headers: headers }
  };
}

function setupProductManagementTemplate_() {
  const sheet = getSheet('Products & Services');
  const headers = getHeadersForSheet('Products & Services');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Product Management Template is ready',
    data: { sheet_name: 'Products & Services', headers: headers }
  };
}

function setupEmployeeManagementTemplate_() {
  const sheets = ['Employees', 'Attendance', 'Leaves'];
  const result = [];
  sheets.forEach(name => {
    const sh = getSheet(name);
    const headers = getHeadersForSheet(name);
    ensureHeaders(sh, headers);
    result.push({ sheet_name: name, headers: headers });
  });
  return {
    success: true,
    message: 'Employee Management Template is ready',
    data: result
  };
}

function setupExpenseManagementTemplate_() {
  const sheet = getSheet('Expenses');
  const headers = getHeadersForSheet('Expenses');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Expense Management Template is ready',
    data: { sheet_name: 'Expenses', headers: headers }
  };
}

function setupQuotationManagementTemplate_() {
  const sheet = getSheet('Qutations');
  const headers = getHeadersForSheet('Qutations');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Quotation Management Template is ready',
    data: { sheet_name: 'Qutations', headers: headers }
  };
}

function setupTasksManagementTemplate_() {
  const sheet = getSheet('Task');
  const headers = getHeadersForSheet('Task');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'Tasks Management Template is ready',
    data: { sheet_name: 'Task', headers: headers }
  };
}

function setupHRManagementTemplate_() {
  const sheet = getSheet('HR');
  const headers = getHeadersForSheet('HR');
  ensureHeaders(sheet, headers);
  return {
    success: true,
    message: 'HR Management Template is ready',
    data: { sheet_name: 'HR', headers: headers }
  };
}

function setupAllManagementTemplates_() {
  const runs = [
    setupAdminManagementTemplate_(),
    setupCustomerManagementTemplate_(),
    setupSupplierManagementTemplate_(),
    setupInvoiceManagementTemplate_(),
    setupProductManagementTemplate_(),
    setupEmployeeManagementTemplate_(),
    setupExpenseManagementTemplate_(),
    setupQuotationManagementTemplate_(),
    setupSettingsManagementTemplate_(),
    setupTasksManagementTemplate_(),
    setupHRManagementTemplate_()
  ];
  return {
    success: true,
    message: 'All Management Templates are ready',
    data: runs
  };
}

function getHRRecords_() {
  return readAll('HR');
}

function getHRRecordById_(id) {
  if (!id) return null;
  const records = readAll('HR');
  for (let i = 0; i < records.length; i++) {
    if (String(records[i].id) === String(id)) return records[i];
  }
  return null;
}

function upsertHRRecord_(record) {
  const headers = H_.HR;
  const row = Object.assign({}, record || {});
  row.updated_at = new Date().toISOString();

  if (row.id) {
    return {
      success: true,
      message: 'HR record updated',
      data: updateRowById('HR', row, headers)
    };
  }

  row.id = generateId_('HR');
  return {
    success: true,
    message: 'HR record added',
    data: addRow('HR', row, headers)
  };
}

function deleteHRRecord_(id) {
  if (!id) {
    return { success: false, message: 'Missing HR record id' };
  }
  return {
    success: true,
    message: 'HR record deleted',
    data: deleteRowById('HR', id)
  };
}

function getDashboardRecords() {
  return readAll('Dashboard');
}

function upsertDashboardMetrics(metrics) {
  const sh = getSheet('Dashboard');
  const headers = getHeadersForSheet('Dashboard');
  const currentLast = sh.getLastRow();
  if (currentLast > 1) {
    sh.getRange(2, 1, currentLast - 1, headers.length).clearContent();
  }
  const rows = Object.keys(metrics || {}).map(metricKey => ([
    `DB-${metricKey}`,
    metricKey,
    metrics[metricKey],
    new Date().toISOString()
  ]));
  if (rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return readAll('Dashboard');
}

function getCustomerContactsRecords(customerId) {
  const all = readAll('CustomerContacts');
  if (!customerId) return all;
  return all.filter(row => String(row.customer_id || '') === String(customerId));
}

function addCustomerContactRecord(contact) {
  const payload = {
    id: String(contact.id || `${new Date().getTime()}`),
    customer_id: String(contact.customer_id || contact.customerId || ''),
    type: String(contact.type || 'Note'),
    message: String(contact.message || contact.note || ''),
    date: String(contact.date || new Date().toISOString().slice(0, 10)),
    created_date: String(contact.created_date || new Date().toISOString())
  };
  return addRow('CustomerContacts', payload, getHeadersForSheet('CustomerContacts'));
}

function verifyAdminCredentials(username, password) {
  const users = readAll('Admin');
  const user = users.find(item =>
    String(item.username || '') === String(username || '') &&
    String(item.password || '') === String(password || '') &&
    String(item.status || 'Active').toLowerCase() === 'active'
  );

  if (!user) {
    return [{ authenticated: false, message: 'Invalid username or password' }];
  }

  return [{
    authenticated: true,
    username: user.username,
    name: user.name || 'Admin',
    role: user.role || 'admin'
  }];
}

function upsertAdminUser(admin) {
  const payload = {
    id: String(admin.id || `ADM-${new Date().getTime()}`),
    username: String(admin.username || ''),
    password: String(admin.password || ''),
    name: String(admin.name || 'Admin'),
    role: String(admin.role || 'admin'),
    status: String(admin.status || 'Active'),
    updated_at: new Date().toISOString()
  };
  if (!payload.username || !payload.password) {
    throw new Error('Admin username and password are required');
  }
  try {
    return updateRowById('Admin', payload, getHeadersForSheet('Admin'));
  } catch (error) {
    return addRow('Admin', payload, getHeadersForSheet('Admin'));
  }
}

function ensureAdminDefaults_(sheet) {
  if (!sheet || sheet.getLastRow() > 1) return;
  const defaultAdmin = {
    id: 'ADM-1',
    username: 'amhsumon',
    password: '@mHs#3030',
    name: 'Admin',
    role: 'admin',
    status: 'Active',
    updated_at: new Date().toISOString()
  };
  const columns = getHeadersForSheet('Admin');
  sheet.appendRow(columns.map(c => defaultAdmin[c] || ''));
}

function ensureHeaders(sh, headers) {
  const safeHeaders = getSafeHeaders_(headers);
  ensureColumnCapacity_(sh, safeHeaders.length);
  const width = Math.max(safeHeaders.length, sh.getLastColumn() || 0, 1);
  const current = sh.getRange(1, 1, 1, width).getValues()[0];
  const needsUpdate = safeHeaders.some((header, index) => String(current[index] || "") !== header);
  if (needsUpdate) {
    sh.getRange(1, 1, 1, safeHeaders.length).setValues([safeHeaders]);
  }
}

function getSafeHeaders_(headers) {
  if (!Array.isArray(headers)) return ['id'];
  const cleaned = headers
    .map(h => String(h || '').trim())
    .filter(h => h !== '');
  return cleaned.length ? cleaned : ['id'];
}

function ensureColumnCapacity_(sheet, requiredColumns) {
  const needed = Math.max(1, Number(requiredColumns) || 1);
  const maxColumns = Math.max(1, Number(sheet.getMaxColumns()) || 1);
  if (maxColumns < needed) {
    sheet.insertColumnsAfter(maxColumns, needed - maxColumns);
  }
}

function formatApiErrorMessage_(error) {
  const raw = String((error && error.message) || error || 'Unknown server error');
  const cleaned = raw.replace(/^Exception:\s*/i, '').trim();

  if (/يجب\s+ألا\s+تقل\s+الأعمدة\s+في\s+النطاق\s+عن\s+عمود\s+واحد/.test(cleaned)) {
    return 'Range must have at least one column.';
  }

  return cleaned || 'Unknown server error';
}

function parseDataUrl_(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data format');
  }
  return {
    mimeType: match[1],
    bytes: Utilities.base64Decode(match[2])
  };
}

function extractDriveFolderId_(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  let match = text.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (!match) match = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (match && match[1]) return match[1];

  if (/^[A-Za-z0-9_-]{20,}$/.test(text)) return text;
  return '';
}

function getFileExtensionFromMime_(mimeType) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  return map[String(mimeType || '').toLowerCase()] || 'png';
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function outputMaybeJsonp_(obj, callback) {
  if (!callback) return jsonOut(obj);
  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(obj)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function sanitizeJsonpCallback_(value) {
  const callback = String(value || '').trim();
  if (!callback) return '';
  if (!/^[A-Za-z_$][0-9A-Za-z_$\.]{0,100}$/.test(callback)) return '';
  return callback;
}
