// ==================== CONFIGURATION ====================
// Your Google Spreadsheet ID (from the spreadsheet URL)
const SPREADSHEET_ID = '1okpAP9AlmmKai3jn5SfjzGuuLcW1eS4vAbMZSjyD5u0';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Handle GET requests — used as a connectivity / health-check ping
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'API is online', data: [] }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const action = payload.action;

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
      deleteQuotation: () => deleteRowById("Qutations", payload.id)
    };

    if (!handlers[action]) {
      return jsonOut({ success: false, message: "Unknown action: " + action, data: [] });
    }

    const data = handlers[action]();
    return jsonOut({ success: true, message: "OK", data: data });
  } catch (err) {
    return jsonOut({ success: false, message: err.message, data: [] });
  }
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
  let sh = ss.getSheetByName(name);
  const headers = getHeadersForSheet(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    initializeHeaders(sh, name);
  } else {
    ensureHeaders(sh, headers);
  }
  return sh;
}

function initializeHeaders(sh, name) {
  const headers = getHeadersForSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function getHeadersForSheet(name) {
  const map = {
    Employees: ["id", "name", "role", "department", "salary", "email", "mobile", "home_address", "website", "profile_photo"],
    Attendance: ["id", "employee_id", "date", "status"],
    Leaves: ["id", "employee_id", "type", "from_date", "to_date", "status"],
    Tasks: ["id", "title", "priority", "status"],
    Suppliers: ["id", "name", "phone", "email", "company", "vat", "address", "payment_terms", "bank_details", "contact_person", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_purchase_date"],
    Customers: ["id", "name", "phone", "email", "company", "vat", "address", "tag", "credit_limit", "payment_terms", "customer_type", "status", "notes", "opening_balance", "opening_balance_type", "closing_balance", "closing_balance_type", "total_purchase", "total_paid", "due", "last_payment_date", "last_contact"],
    CustomerTransactions: ["id", "customer_id", "type", "amount", "date", "note"],
    SupplierTransactions: ["id", "supplier_id", "type", "amount", "date", "note"],
    Invoices: ["id", "invoice_no", "customer_id", "customer_name", "date", "due_date", "subtotal", "total", "vat", "discount", "shipping", "advance_payment", "amount_due", "currency", "status", "items"],
    "Products & Services": ["id", "name", "description", "price", "vat", "supplier_id", "supplier_name", "cost", "vat_included", "dont_update_qty"],
    Expenses: ["id", "date", "category", "description", "amount"],
    SupplierPurchases: ["id", "supplier_id", "product_name", "quantity", "unit_price", "total", "vat_amount", "vat_rate", "paid_amount", "due_amount", "purchase_date", "due_date", "status", "notes"],
    SupplierPayments: ["id", "supplier_id", "purchase_id", "voucher_no", "amount", "payment_date", "payment_method", "notes"],
    Qutations: ["id", "quotation_no", "customer_id", "customer_name", "date", "subtotal", "total", "vat", "discount", "status", "items"]
  };
  return map[name] || ["id"];
}

function ensureHeaders(sh, headers) {
  const width = Math.max(headers.length, sh.getLastColumn() || 0, 1);
  const current = sh.getRange(1, 1, 1, width).getValues()[0];
  const needsUpdate = headers.some((header, index) => String(current[index] || "") !== header);
  if (needsUpdate) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
