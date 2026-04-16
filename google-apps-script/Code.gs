// ==================== CONFIGURATION ====================
// Your Google Spreadsheet ID (from the spreadsheet URL)
const SPREADSHEET_ID = '1okpAP9AlmmKai3jn5SfjzGuuLcW1eS4vAbMZSjyD5u0';
const SHEET_NAME_ALIASES = {
  Tasks: 'Task',
  Task: 'Task',
  SupplierPurchases: 'Supplierpurchases',
  Supplierpurchases: 'Supplierpurchases',
  Qutations: 'Qutations',
  Settings: 'Settings',
  Dashboard: 'Dashboard',
  CustomerContacts: 'CustomerContacts',
  Admin: 'Admin'
};

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Backward-compatible Apps Script entry point.
// Some older deployments/triggers still call `myFunction` by default.
function myFunction() {
  ensureRequiredSheets_();
  return { success: true, message: 'Initialization completed' };
}

// Handle GET requests — used as a connectivity / health-check ping
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'API is online', data: [], storage: 'Google Sheets' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const action = payload.action;
    ensureRequiredSheets_();

    const handlers = {
      getEmployees: () => readAll("Employees"),
      addEmployee: () => addRow("Employees", payload.employee, ["id", "name", "role", "department", "salary", "email", "mobile", "home_address", "website", "profile_photo"]),
      updateEmployee: () => updateRowById("Employees", payload.employee, ["id", "name", "role", "department", "salary", "email", "mobile", "home_address", "website", "profile_photo"]),
      deleteEmployee: () => deleteRowById("Employees", payload.id),

      getAttendance: () => readAll("Attendance"),
      addAttendance: () => addRow("Attendance", payload.attendance, ["id", "employee_id", "date", "status"]),
  updateAttendance: () => updateRowById("Attendance", payload.attendance, ["id", "employee_id", "date", "status"]),
  deleteAttendance: () => deleteRowById("Attendance", payload.id),

      getLeaves: () => readAll("Leaves"),
      addLeave: () => addRow("Leaves", payload.leave, ["id", "employee_id", "type", "from_date", "to_date", "status"]),
  updateLeave: () => updateRowById("Leaves", payload.leave, ["id", "employee_id", "type", "from_date", "to_date", "status"]),
  deleteLeave: () => deleteRowById("Leaves", payload.id),

      getTasks: () => readAll("Tasks"),
      addTask: () => addRow("Tasks", payload.task, ["id", "title", "priority", "status"]),
      updateTask: () => updateRowById("Tasks", payload.task, ["id", "title", "priority", "status"]),

      getCustomers: () => readAll("Customers"),
      addCustomer: () => addRow("Customers", payload.customer, ["id", "name", "phone", "email", "company", "vat", "address", "tag", "credit_limit", "payment_terms", "customer_type", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_payment_date", "last_contact"]),
      updateCustomer: () => updateRowById("Customers", payload.customer, ["id", "name", "phone", "email", "company", "vat", "address", "tag", "credit_limit", "payment_terms", "customer_type", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_payment_date", "last_contact"]),
      deleteCustomer: () => deleteRowById("Customers", payload.id),

      getSuppliers: () => readAll("Suppliers"),
      addSupplier: () => addRow("Suppliers", payload.supplier, ["id", "name", "phone", "email", "company", "vat", "address", "payment_terms", "bank_details", "contact_person", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_purchase_date"]),
      updateSupplier: () => updateRowById("Suppliers", payload.supplier, ["id", "name", "phone", "email", "company", "vat", "address", "payment_terms", "bank_details", "contact_person", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_purchase_date"]),
      deleteSupplier: () => deleteRowById("Suppliers", payload.id),

      getCustomerTransactions: () => readAll("CustomerTransactions"),
      addCustomerTransaction: () => addRow("CustomerTransactions", payload.transaction, ["id", "customer_id", "type", "amount", "date", "note"]),
      getSupplierTransactions: () => readAll("SupplierTransactions"),
      addSupplierTransaction: () => addRow("SupplierTransactions", payload.transaction, ["id", "supplier_id", "type", "amount", "date", "note"]),

      getInvoices: () => readAll("Invoices"),
      addInvoice: () => addRow("Invoices", payload.invoice, ["id", "invoice_no", "customer_id", "customer_name", "date", "due_date", "subtotal", "total", "vat", "discount", "shipping", "advance_payment", "amount_due", "currency", "status", "items"]),
      updateInvoice: () => updateRowById("Invoices", payload.invoice, ["id", "invoice_no", "customer_id", "customer_name", "date", "due_date", "subtotal", "total", "vat", "discount", "shipping", "advance_payment", "amount_due", "currency", "status", "items"]),
      deleteInvoice: () => deleteRowById("Invoices", payload.id),

      getProducts: () => readAll("Products & Services"),
      addProduct: () => addRow("Products & Services", payload.product, ["id", "name", "description", "price", "vat", "supplier_id", "supplier_name", "cost", "vat_included", "dont_update_qty"]),
      updateProduct: () => updateRowById("Products & Services", payload.product, ["id", "name", "description", "price", "vat", "supplier_id", "supplier_name", "cost", "vat_included", "dont_update_qty"]),
      deleteProduct: () => deleteRowById("Products & Services", payload.id),

      getExpenses: () => readAll("Expenses"),
      addExpense: () => addRow("Expenses", payload.expense, ["id", "date", "category", "description", "amount"]),
      updateExpense: () => updateRowById("Expenses", payload.expense, ["id", "date", "category", "description", "amount"]),
      deleteExpense: () => deleteRowById("Expenses", payload.id),

      getSupplierPurchases: () => readAll("SupplierPurchases"),
      addSupplierPurchase: () => addRow("SupplierPurchases", payload.purchase, ["id", "supplier_id", "product_name", "quantity", "unit_price", "total", "vat_amount", "vat_rate", "paid_amount", "due_amount", "purchase_date", "due_date", "status", "notes"]),
      updateSupplierPurchase: () => updateRowById("SupplierPurchases", payload.purchase, ["id", "supplier_id", "product_name", "quantity", "unit_price", "total", "vat_amount", "vat_rate", "paid_amount", "due_amount", "purchase_date", "due_date", "status", "notes"]),
      deleteSupplierPurchase: () => deleteRowById("SupplierPurchases", payload.id),

      getSupplierPayments: () => readAll("SupplierPayments"),
      addSupplierPayment: () => addRow("SupplierPayments", payload.payment, ["id", "supplier_id", "purchase_id", "voucher_no", "amount", "payment_date", "payment_method", "notes"]),

      getQuotations: () => readAll("Qutations"),
      addQuotation: () => addRow("Qutations", payload.quotation, ["id", "quotation_no", "customer_id", "customer_name", "date", "subtotal", "total", "vat", "discount", "status", "items"]),
      updateQuotation: () => updateRowById("Qutations", payload.quotation, ["id", "quotation_no", "customer_id", "customer_name", "date", "subtotal", "total", "vat", "discount", "status", "items"]),
      deleteQuotation: () => deleteRowById("Qutations", payload.id),

      getSettings: () => getSettingsRecords(),
      upsertSetting: () => upsertSettingRecord(payload.key, payload.value),
      upsertSettings: () => upsertSettingsMap(payload.settings || {}),

      getDashboard: () => getDashboardRecords(),
      upsertDashboard: () => upsertDashboardMetrics(payload.metrics || {}),

      getCustomerContacts: () => getCustomerContactsRecords(payload.customer_id),
      addCustomerContact: () => addCustomerContactRecord(payload.contact || payload),

      verifyAdmin: () => verifyAdminCredentials(payload.username, payload.password),
      upsertAdmin: () => upsertAdminUser(payload.admin || payload)
    };

    if (!handlers[action]) {
      return jsonOut({ success: false, message: "Unknown action: " + action, data: [] });
    }

    const data = handlers[action]();
    return jsonOut({ success: true, message: "OK", data: data });
  } catch (err) {
    return jsonOut({ success: false, message: formatApiErrorMessage_(err), data: [] });
  }
}

function ensureRequiredSheets_() {
  [
    'Customers',
    'Suppliers',
    'Products & Services',
    'Invoices',
    'Expenses',
    'Qutations',
    'Employees',
    'Attendance',
    'Leaves',
    'Task',
    'Supplierpurchases',
    'SupplierPayments',
    'CustomerTransactions',
    'SupplierTransactions',
    'CustomerContacts',
    'Settings',
    'Dashboard',
    'Admin'
  ].forEach(sheetName => getSheet(sheetName));
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
    Employees: ["id", "name", "role", "department", "salary", "email", "mobile", "home_address", "website", "profile_photo"],
    Attendance: ["id", "employee_id", "date", "status"],
    Leaves: ["id", "employee_id", "type", "from_date", "to_date", "status"],
    Task: ["id", "title", "priority", "status"],
    Suppliers: ["id", "name", "phone", "email", "company", "vat", "address", "payment_terms", "bank_details", "contact_person", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_purchase_date"],
    Customers: ["id", "name", "phone", "email", "company", "vat", "address", "tag", "credit_limit", "payment_terms", "customer_type", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_payment_date", "last_contact"],
    CustomerContacts: ["id", "customer_id", "type", "message", "date", "created_date"],
    CustomerTransactions: ["id", "customer_id", "type", "amount", "date", "note"],
    SupplierTransactions: ["id", "supplier_id", "type", "amount", "date", "note"],
    Invoices: ["id", "invoice_no", "customer_id", "customer_name", "date", "due_date", "subtotal", "total", "vat", "discount", "shipping", "advance_payment", "amount_due", "currency", "status", "items"],
    "Products & Services": ["id", "name", "description", "price", "vat", "supplier_id", "supplier_name", "cost", "vat_included", "dont_update_qty"],
    Expenses: ["id", "date", "category", "description", "amount"],
    Supplierpurchases: ["id", "supplier_id", "product_name", "quantity", "unit_price", "total", "vat_amount", "vat_rate", "paid_amount", "due_amount", "purchase_date", "due_date", "status", "notes"],
    SupplierPayments: ["id", "supplier_id", "purchase_id", "voucher_no", "amount", "payment_date", "payment_method", "notes"],
    Qutations: ["id", "quotation_no", "customer_id", "customer_name", "date", "subtotal", "total", "vat", "discount", "status", "items"],
    Settings: ["id", "key", "value", "updated_at"],
    Dashboard: ["id", "metric", "value", "updated_at"],
    Admin: ["id", "username", "password", "name", "role", "status", "updated_at"]
  };
  return map[name] || ["id"];
}

function getSettingsRecords() {
  return readAll('Settings');
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

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
