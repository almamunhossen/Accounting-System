/**
 * PROFESSIONAL CRM + SUPPLIER MANAGEMENT SYSTEM
 * Google Apps Script Backend
 * Full API for Customer & Supplier Management
 */

// ==================== CONFIGURATION ====================
const SHEET_NAMES = {
  CUSTOMERS: 'Customers',
  SUPPLIERS: 'Suppliers',
  PRODUCTS: 'Products & Services',
  INVOICES: 'Invoices',
  EXPENSES: 'Expenses',
  QUOTATIONS: 'Qutations',
  EMPLOYEES: 'Employees',
  ATTENDANCE: 'Attendance',
  LEAVES: 'Leaves',
  TASKS: 'Tasks',
  SUPPLIER_PURCHASES: 'SupplierPurchases',
  SUPPLIER_PAYMENTS: 'SupplierPayments',
  CUSTOMER_TRANSACTIONS: 'CustomerTransactions',
  SUPPLIER_TRANSACTIONS: 'SupplierTransactions',
  CUSTOMER_CONTACTS: 'CustomerContacts',
  SETTINGS: 'Settings'
};

const HEADERS = {
  CUSTOMERS: ['id', 'name', 'phone', 'email', 'company', 'vat', 'address', 'tag', 'credit_limit', 'payment_terms', 'opening_balance', 'opening_balance_type', 'total_purchase', 'total_paid', 'due_amount', 'status', 'customer_type', 'created_date', 'last_contact', 'notes'],
  SUPPLIERS: ['id', 'name', 'phone', 'email', 'company', 'vat', 'address', 'payment_terms', 'bank_name', 'bank_account', 'contact_person', 'total_purchase', 'total_paid', 'due_amount', 'status', 'created_date', 'notes'],
  PRODUCTS: ['id', 'name', 'description', 'price', 'vat', 'supplier_id', 'supplier_name', 'cost', 'vat_included', 'dont_update_qty'],
  INVOICES: ['id', 'invoice_no', 'customer_id', 'customer_name', 'date', 'due_date', 'subtotal', 'total', 'vat', 'discount', 'shipping', 'advance_payment', 'amount_due', 'currency', 'status', 'items'],
  EXPENSES: ['id', 'date', 'category', 'description', 'amount'],
  QUOTATIONS: ['id', 'quotation_no', 'customer_id', 'customer_name', 'date', 'subtotal', 'total', 'vat', 'discount', 'status', 'items'],
  EMPLOYEES: ['id', 'name', 'role', 'department', 'salary', 'email', 'mobile', 'home_address', 'website', 'profile_photo'],
  ATTENDANCE: ['id', 'employee_id', 'date', 'status'],
  LEAVES: ['id', 'employee_id', 'type', 'from_date', 'to_date', 'status'],
  TASKS: ['id', 'title', 'priority', 'status'],
  SUPPLIER_PURCHASES: ['id', 'supplier_id', 'product_name', 'quantity', 'unit_price', 'total', 'vat_amount', 'vat_rate', 'paid_amount', 'due_amount', 'purchase_date', 'due_date', 'status', 'notes'],
  SUPPLIER_PAYMENTS: ['id', 'supplier_id', 'purchase_id', 'voucher_no', 'amount', 'payment_date', 'payment_method', 'notes'],
  CUSTOMER_TRANSACTIONS: ['id', 'customer_id', 'type', 'amount', 'date', 'invoice_id', 'note', 'created_date'],
  SUPPLIER_TRANSACTIONS: ['id', 'supplier_id', 'type', 'amount', 'date', 'purchase_id', 'note', 'created_date'],
  CUSTOMER_CONTACTS: ['id', 'customer_id', 'type', 'message', 'date', 'created_date']
};

const PAYMENT_TERMS = [7, 15, 30, 45, 60, 90];
const CUSTOMER_TYPES = ['Individual', 'Company'];
const STATUSES = ['Active', 'Inactive'];
const TRANSACTION_TYPES = {
  CUSTOMER: ['Invoice', 'Payment', 'Credit Note', 'Adjustment'],
  SUPPLIER: ['Purchase', 'Payment', 'Credit Note', 'Adjustment']
};
const CONTACT_TYPES = ['Call', 'WhatsApp', 'Email', 'SMS', 'Visit', 'Note'];

const CRM_SPREADSHEET_ID = '1okpAP9AlmmKai3jn5SfjzGuuLcW1eS4vAbMZSjyD5u0';

function getCRMSpreadsheet() {
  return SpreadsheetApp.openById(CRM_SPREADSHEET_ID);
}

// ==================== INITIALIZATION ====================
function initializeSheets() {
  const ss = getCRMSpreadsheet();
  
  // Create sheets if they don't exist
  Object.values(SHEET_NAMES).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log(`Created sheet: ${name}`);
    }
  });
  
  // Initialize headers
  initializeSheetHeaders();
  Logger.log('All sheets initialized successfully');
}

function initializeSheetHeaders() {
  const ss = getCRMSpreadsheet();
  
  const sheets = {
    [SHEET_NAMES.CUSTOMERS]: HEADERS.CUSTOMERS,
    [SHEET_NAMES.SUPPLIERS]: HEADERS.SUPPLIERS,
    [SHEET_NAMES.CUSTOMER_TRANSACTIONS]: HEADERS.CUSTOMER_TRANSACTIONS,
    [SHEET_NAMES.SUPPLIER_TRANSACTIONS]: HEADERS.SUPPLIER_TRANSACTIONS,
    [SHEET_NAMES.CUSTOMER_CONTACTS]: HEADERS.CUSTOMER_CONTACTS
  };
  
  Object.entries(sheets).forEach(([sheetName, headers]) => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      Logger.log(`Headers added to ${sheetName}`);
    }
  });
}

// ==================== CUSTOMER MANAGEMENT ====================
function getCustomers(filters = {}) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const customers = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const customer = objectFromRow(row, headers);
    
    // Apply filters
    if (filters.tag && customer.tag !== filters.tag) continue;
    if (filters.status && customer.status !== filters.status) continue;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!customer.name.toLowerCase().includes(search) &&
          !customer.email.toLowerCase().includes(search) &&
          !customer.phone.includes(search)) {
        continue;
      }
    }
    
    customers.push(customer);
  }
  
  return customers;
}

function getCustomerById(customerId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === customerId) {
      return objectFromRow(row, headers);
    }
  }
  
  return null;
}

function addCustomer(customerData) {
  const headers = HEADERS.CUSTOMERS;
  const sheet = ensureSheetWithHeadersByName_(SHEET_NAMES.CUSTOMERS, headers);
  
  const id = generateId('CUST');
  const newCustomer = {
    id: id,
    name: customerData.name || '',
    phone: customerData.phone || '',
    email: customerData.email || '',
    company: customerData.company || '',
    vat: customerData.vat || '',
    address: customerData.address || '',
    tag: customerData.tag || 'New',
    credit_limit: customerData.credit_limit || 0,
    payment_terms: customerData.payment_terms || 30,
    opening_balance: customerData.opening_balance || 0,
    opening_balance_type: customerData.opening_balance_type || 'Dr',
    total_purchase: 0,
    total_paid: 0,
    due_amount: customerData.opening_balance || 0,
    status: customerData.status || 'Active',
    customer_type: customerData.customer_type || 'Individual',
    created_date: new Date().toISOString(),
    last_contact: '',
    notes: customerData.notes || ''
  };
  
  const row = rowFromObject(newCustomer, headers);
  sheet.appendRow(row);
  
  return { success: true, message: 'Customer added successfully', data: newCustomer };
}

function updateCustomer(customerId, customerData) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === customerId) {
      const current = objectFromRow(data[i], headers);
      const updated = { ...current, ...customerData };
      
      // Recalculate due amount
      updated.due_amount = calculateCustomerDue(updated);
      
      const row = rowFromObject(updated, headers);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      
      return { success: true, message: 'Customer updated successfully', data: updated };
    }
  }
  
  return { success: false, message: 'Customer not found' };
}

function deleteCustomer(customerId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === customerId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Customer deleted successfully' };
    }
  }
  
  return { success: false, message: 'Customer not found' };
}

function calculateCustomerDue(customer) {
  const opening = (customer.opening_balance_type === 'Dr') ? customer.opening_balance : -customer.opening_balance;
  const totalDue = opening + (customer.total_purchase || 0) - (customer.total_paid || 0);
  return Math.max(0, totalDue);
}

// ==================== SUPPLIER MANAGEMENT ====================
function getSuppliers(filters = {}) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const suppliers = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const supplier = objectFromRow(row, headers);
    
    // Apply filters
    if (filters.status && supplier.status !== filters.status) continue;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!supplier.name.toLowerCase().includes(search) &&
          !supplier.email.toLowerCase().includes(search) &&
          !supplier.phone.includes(search)) {
        continue;
      }
    }
    
    suppliers.push(supplier);
  }
  
  return suppliers;
}

function getSupplierById(supplierId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === supplierId) {
      return objectFromRow(row, headers);
    }
  }
  
  return null;
}

function addSupplier(supplierData) {
  const headers = HEADERS.SUPPLIERS;
  const sheet = ensureSheetWithHeadersByName_(SHEET_NAMES.SUPPLIERS, headers);
  
  const id = generateId('SUP');
  const newSupplier = {
    id: id,
    name: supplierData.name || '',
    phone: supplierData.phone || '',
    email: supplierData.email || '',
    company: supplierData.company || '',
    vat: supplierData.vat || '',
    address: supplierData.address || '',
    payment_terms: supplierData.payment_terms || 30,
    bank_name: supplierData.bank_name || '',
    bank_account: supplierData.bank_account || '',
    contact_person: supplierData.contact_person || '',
    total_purchase: 0,
    total_paid: 0,
    due_amount: 0,
    status: supplierData.status || 'Active',
    created_date: new Date().toISOString(),
    notes: supplierData.notes || ''
  };
  
  const row = rowFromObject(newSupplier, headers);
  sheet.appendRow(row);
  
  return { success: true, message: 'Supplier added successfully', data: newSupplier };
}

function updateSupplier(supplierId, supplierData) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === supplierId) {
      const current = objectFromRow(data[i], headers);
      const updated = { ...current, ...supplierData };
      
      // Recalculate due amount
      updated.due_amount = updated.total_purchase - updated.total_paid;
      
      const row = rowFromObject(updated, headers);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      
      return { success: true, message: 'Supplier updated successfully', data: updated };
    }
  }
  
  return { success: false, message: 'Supplier not found' };
}

function deleteSupplier(supplierId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === supplierId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Supplier deleted successfully' };
    }
  }
  
  return { success: false, message: 'Supplier not found' };
}

// ==================== CUSTOMER TRANSACTIONS ====================
function addCustomerTransaction(transactionData) {
  const headers = HEADERS.CUSTOMER_TRANSACTIONS;
  const sheet = ensureSheetWithHeadersByName_(SHEET_NAMES.CUSTOMER_TRANSACTIONS, headers);
  
  const id = generateId('CTRANS');
  const newTransaction = {
    id: id,
    customer_id: transactionData.customer_id,
    type: transactionData.type || 'Invoice',
    amount: transactionData.amount || 0,
    date: transactionData.date || new Date().toISOString().split('T')[0],
    invoice_id: transactionData.invoice_id || '',
    note: transactionData.note || '',
    created_date: new Date().toISOString()
  };
  
  const row = rowFromObject(newTransaction, headers);
  sheet.appendRow(row);
  
  // Update customer totals
  updateCustomerFinancials(transactionData.customer_id);
  
  return { success: true, message: 'Transaction recorded', data: newTransaction };
}

function getCustomerTransactions(customerId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMER_TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const transactions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === customerId) { // customer_id is at index 1
      transactions.push(objectFromRow(row, headers));
    }
  }
  
  return transactions;
}

function updateCustomerFinancials(customerId) {
  const transactions = getCustomerTransactions(customerId);
  const customer = getCustomerById(customerId);
  
  if (!customer) return;
  
  let totalPurchase = 0;
  let totalPaid = 0;
  
  transactions.forEach(trans => {
    const amount = parseFloat(trans.amount) || 0;
    if (trans.type === 'Invoice') {
      totalPurchase += amount;
    } else if (trans.type === 'Payment' || trans.type === 'Credit Note') {
      totalPaid += parseFloat(trans.amount) || 0;
    }
  });
  
  const updated = {
    total_purchase: totalPurchase,
    total_paid: totalPaid,
    due_amount: calculateCustomerDue({ ...customer, total_purchase: totalPurchase, total_paid: totalPaid })
  };
  
  updateCustomer(customerId, updated);
}

// ==================== SUPPLIER TRANSACTIONS ====================
function addSupplierTransaction(transactionData) {
  const headers = HEADERS.SUPPLIER_TRANSACTIONS;
  const sheet = ensureSheetWithHeadersByName_(SHEET_NAMES.SUPPLIER_TRANSACTIONS, headers);
  
  const id = generateId('STRANS');
  const newTransaction = {
    id: id,
    supplier_id: transactionData.supplier_id,
    type: transactionData.type || 'Purchase',
    amount: transactionData.amount || 0,
    date: transactionData.date || new Date().toISOString().split('T')[0],
    purchase_id: transactionData.purchase_id || '',
    note: transactionData.note || '',
    created_date: new Date().toISOString()
  };
  
  const row = rowFromObject(newTransaction, headers);
  sheet.appendRow(row);
  
  // Update supplier totals
  updateSupplierFinancials(transactionData.supplier_id);
  
  return { success: true, message: 'Transaction recorded', data: newTransaction };
}

function getSupplierTransactions(supplierId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.SUPPLIER_TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const transactions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === supplierId) { // supplier_id is at index 1
      transactions.push(objectFromRow(row, headers));
    }
  }
  
  return transactions;
}

function updateSupplierFinancials(supplierId) {
  const transactions = getSupplierTransactions(supplierId);
  const supplier = getSupplierById(supplierId);
  
  if (!supplier) return;
  
  let totalPurchase = 0;
  let totalPaid = 0;
  
  transactions.forEach(trans => {
    const amount = parseFloat(trans.amount) || 0;
    if (trans.type === 'Purchase') {
      totalPurchase += amount;
    } else if (trans.type === 'Payment') {
      totalPaid += amount;
    }
  });
  
  const updated = {
    total_purchase: totalPurchase,
    total_paid: totalPaid,
    due_amount: totalPurchase - totalPaid
  };
  
  updateSupplier(supplierId, updated);
}

// ==================== CUSTOMER CONTACT LOG ====================
function addCustomerContact(contactData) {
  const headers = HEADERS.CUSTOMER_CONTACTS;
  const sheet = ensureSheetWithHeadersByName_(SHEET_NAMES.CUSTOMER_CONTACTS, headers);
  
  const id = generateId('CONTACT');
  const newContact = {
    id: id,
    customer_id: contactData.customer_id,
    type: contactData.type || 'Note',
    message: contactData.message || '',
    date: contactData.date || new Date().toISOString().split('T')[0],
    created_date: new Date().toISOString()
  };
  
  const row = rowFromObject(newContact, headers);
  sheet.appendRow(row);
  
  // Update last contact
  const customer = getCustomerById(contactData.customer_id);
  if (customer) {
    updateCustomer(contactData.customer_id, { last_contact: new Date().toISOString().split('T')[0] });
  }
  
  return { success: true, message: 'Contact logged', data: newContact };
}

function getCustomerContacts(customerId) {
  const sheet = getCRMSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMER_CONTACTS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const contacts = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === customerId) { // customer_id is at index 1
      contacts.push(objectFromRow(row, headers));
    }
  }
  
  // Sort by date descending
  return contacts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ==================== SEARCH/ANALYTICS ====================
function getCustomerStatistics() {
  const customers = getCustomers();
  
  const stats = {
    total_customers: customers.length,
    active_customers: customers.filter(c => c.status === 'Active').length,
    total_credit_limit: customers.reduce((sum, c) => sum + (parseFloat(c.credit_limit) || 0), 0),
    total_due: customers.reduce((sum, c) => sum + (parseFloat(c.due_amount) || 0), 0),
    total_purchase: customers.reduce((sum, c) => sum + (parseFloat(c.total_purchase) || 0), 0),
    total_paid: customers.reduce((sum, c) => sum + (parseFloat(c.total_paid) || 0), 0),
    customer_tags: getCustomerTags()
  };
  
  return stats;
}

function getCustomerTags() {
  const customers = getCustomers();
  const tags = {};
  
  customers.forEach(c => {
    tags[c.tag] = (tags[c.tag] || 0) + 1;
  });
  
  return tags;
}

function getSupplierStatistics() {
  const suppliers = getSuppliers();
  
  return {
    total_suppliers: suppliers.length,
    active_suppliers: suppliers.filter(s => s.status === 'Active').length,
    total_due: suppliers.reduce((sum, s) => sum + (parseFloat(s.due_amount) || 0), 0),
    total_purchase: suppliers.reduce((sum, s) => sum + (parseFloat(s.total_purchase) || 0), 0),
    total_paid: suppliers.reduce((sum, s) => sum + (parseFloat(s.total_paid) || 0), 0)
  };
}

// ==================== API HANDLER ====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch (action) {
      // Customers
      case 'getCustomers':
        result = { success: true, data: getCustomers(data.filters || {}) };
        break;
      case 'getCustomerById':
        result = { success: true, data: getCustomerById(data.customer_id || data.customerId || data.id) };
        break;
      case 'addCustomer':
        result = addCustomer(data.customer || data);
        break;
      case 'updateCustomer':
        result = updateCustomer(data.customer_id || data.customerId || data.id || (data.customer && data.customer.id), data.customer || data);
        break;
      case 'deleteCustomer':
        result = deleteCustomer(data.customer_id || data.customerId || data.id);
        break;
      
      // Suppliers
      case 'getSuppliers':
        result = { success: true, data: getSuppliers(data.filters || {}) };
        break;
      case 'getSupplierById':
        result = { success: true, data: getSupplierById(data.supplier_id || data.supplierId || data.id) };
        break;
      case 'addSupplier':
        result = addSupplier(data.supplier || data);
        break;
      case 'updateSupplier':
        result = updateSupplier(data.supplier_id || data.supplierId || data.id || (data.supplier && data.supplier.id), data.supplier || data);
        break;
      case 'deleteSupplier':
        result = deleteSupplier(data.supplier_id || data.supplierId || data.id);
        break;
      
      // Transactions
      case 'addCustomerTransaction':
        result = addCustomerTransaction(data.transaction || data);
        break;
      case 'getCustomerTransactions':
        result = { success: true, data: getCustomerTransactions(data.customer_id || data.customerId || data.id) };
        break;
      case 'addSupplierTransaction':
        result = addSupplierTransaction(data.transaction || data);
        break;
      case 'getSupplierTransactions':
        result = { success: true, data: getSupplierTransactions(data.supplier_id || data.supplierId || data.id) };
        break;

      // HR
      case 'getEmployees':
        result = { success: true, data: readAllByName_(SHEET_NAMES.EMPLOYEES, HEADERS.EMPLOYEES) };
        break;
      case 'addEmployee':
        result = { success: true, data: addByName_(SHEET_NAMES.EMPLOYEES, HEADERS.EMPLOYEES, data.employee || {}, 'EMP') };
        break;
      case 'updateEmployee': {
        const updatedEmployee = updateByName_(SHEET_NAMES.EMPLOYEES, HEADERS.EMPLOYEES, data.employee || {});
        result = updatedEmployee ? { success: true, data: updatedEmployee } : { success: false, message: 'Employee not found' };
        break;
      }
      case 'deleteEmployee': {
        const deletedEmployee = deleteByName_(SHEET_NAMES.EMPLOYEES, HEADERS.EMPLOYEES, data.id);
        result = deletedEmployee ? { success: true, message: 'Employee deleted' } : { success: false, message: 'Employee not found' };
        break;
      }

      case 'getAttendance':
        result = { success: true, data: readAllByName_(SHEET_NAMES.ATTENDANCE, HEADERS.ATTENDANCE) };
        break;
      case 'addAttendance':
        result = { success: true, data: addByName_(SHEET_NAMES.ATTENDANCE, HEADERS.ATTENDANCE, data.attendance || {}, 'ATT') };
        break;
      case 'updateAttendance': {
        const updatedAttendance = updateByName_(SHEET_NAMES.ATTENDANCE, HEADERS.ATTENDANCE, data.attendance || {});
        result = updatedAttendance ? { success: true, data: updatedAttendance } : { success: false, message: 'Attendance not found' };
        break;
      }
      case 'deleteAttendance': {
        const deletedAttendance = deleteByName_(SHEET_NAMES.ATTENDANCE, HEADERS.ATTENDANCE, data.id);
        result = deletedAttendance ? { success: true, message: 'Attendance deleted' } : { success: false, message: 'Attendance not found' };
        break;
      }

      case 'getLeaves':
        result = { success: true, data: readAllByName_(SHEET_NAMES.LEAVES, HEADERS.LEAVES) };
        break;
      case 'addLeave':
        result = { success: true, data: addByName_(SHEET_NAMES.LEAVES, HEADERS.LEAVES, data.leave || {}, 'LEV') };
        break;
      case 'updateLeave': {
        const updatedLeave = updateByName_(SHEET_NAMES.LEAVES, HEADERS.LEAVES, data.leave || {});
        result = updatedLeave ? { success: true, data: updatedLeave } : { success: false, message: 'Leave not found' };
        break;
      }
      case 'deleteLeave': {
        const deletedLeave = deleteByName_(SHEET_NAMES.LEAVES, HEADERS.LEAVES, data.id);
        result = deletedLeave ? { success: true, message: 'Leave deleted' } : { success: false, message: 'Leave not found' };
        break;
      }

      case 'getTasks':
        result = { success: true, data: readAllByName_(SHEET_NAMES.TASKS, HEADERS.TASKS) };
        break;
      case 'addTask':
        result = { success: true, data: addByName_(SHEET_NAMES.TASKS, HEADERS.TASKS, data.task || {}, 'TSK') };
        break;
      case 'updateTask': {
        const updatedTask = updateByName_(SHEET_NAMES.TASKS, HEADERS.TASKS, data.task || {});
        result = updatedTask ? { success: true, data: updatedTask } : { success: false, message: 'Task not found' };
        break;
      }

      // Products
      case 'getProducts':
        result = { success: true, data: readAllByName_(SHEET_NAMES.PRODUCTS, HEADERS.PRODUCTS) };
        break;
      case 'addProduct':
        result = { success: true, data: addByName_(SHEET_NAMES.PRODUCTS, HEADERS.PRODUCTS, data.product || {}, 'PROD') };
        break;
      case 'updateProduct': {
        const updatedProduct = updateByName_(SHEET_NAMES.PRODUCTS, HEADERS.PRODUCTS, data.product || {});
        result = updatedProduct ? { success: true, data: updatedProduct } : { success: false, message: 'Product not found' };
        break;
      }
      case 'deleteProduct': {
        const deletedProduct = deleteByName_(SHEET_NAMES.PRODUCTS, HEADERS.PRODUCTS, data.id);
        result = deletedProduct ? { success: true, message: 'Product deleted' } : { success: false, message: 'Product not found' };
        break;
      }

      // Invoices
      case 'getInvoices':
        result = { success: true, data: readAllByName_(SHEET_NAMES.INVOICES, HEADERS.INVOICES) };
        break;
      case 'addInvoice':
        result = { success: true, data: addByName_(SHEET_NAMES.INVOICES, HEADERS.INVOICES, data.invoice || {}, 'INV') };
        break;
      case 'updateInvoice': {
        const updatedInvoice = updateByName_(SHEET_NAMES.INVOICES, HEADERS.INVOICES, data.invoice || {});
        result = updatedInvoice ? { success: true, data: updatedInvoice } : { success: false, message: 'Invoice not found' };
        break;
      }
      case 'deleteInvoice': {
        const deletedInvoice = deleteByName_(SHEET_NAMES.INVOICES, HEADERS.INVOICES, data.id);
        result = deletedInvoice ? { success: true, message: 'Invoice deleted' } : { success: false, message: 'Invoice not found' };
        break;
      }

      // Expenses
      case 'getExpenses':
        result = { success: true, data: readAllByName_(SHEET_NAMES.EXPENSES, HEADERS.EXPENSES) };
        break;
      case 'addExpense':
        result = { success: true, data: addByName_(SHEET_NAMES.EXPENSES, HEADERS.EXPENSES, data.expense || {}, 'EXP') };
        break;
      case 'updateExpense': {
        const updatedExpense = updateByName_(SHEET_NAMES.EXPENSES, HEADERS.EXPENSES, data.expense || {});
        result = updatedExpense ? { success: true, data: updatedExpense } : { success: false, message: 'Expense not found' };
        break;
      }
      case 'deleteExpense': {
        const deletedExpense = deleteByName_(SHEET_NAMES.EXPENSES, HEADERS.EXPENSES, data.id);
        result = deletedExpense ? { success: true, message: 'Expense deleted' } : { success: false, message: 'Expense not found' };
        break;
      }

      // Quotations
      case 'getQuotations':
        result = { success: true, data: readAllByName_(SHEET_NAMES.QUOTATIONS, HEADERS.QUOTATIONS) };
        break;
      case 'addQuotation':
        result = { success: true, data: addByName_(SHEET_NAMES.QUOTATIONS, HEADERS.QUOTATIONS, data.quotation || {}, 'QTN') };
        break;
      case 'updateQuotation': {
        const updatedQuotation = updateByName_(SHEET_NAMES.QUOTATIONS, HEADERS.QUOTATIONS, data.quotation || {});
        result = updatedQuotation ? { success: true, data: updatedQuotation } : { success: false, message: 'Quotation not found' };
        break;
      }
      case 'deleteQuotation': {
        const deletedQuotation = deleteByName_(SHEET_NAMES.QUOTATIONS, HEADERS.QUOTATIONS, data.id);
        result = deletedQuotation ? { success: true, message: 'Quotation deleted' } : { success: false, message: 'Quotation not found' };
        break;
      }

      // Supplier purchases / payments
      case 'getSupplierPurchases':
        result = { success: true, data: readAllByName_(SHEET_NAMES.SUPPLIER_PURCHASES, HEADERS.SUPPLIER_PURCHASES) };
        break;
      case 'addSupplierPurchase':
        result = { success: true, data: addByName_(SHEET_NAMES.SUPPLIER_PURCHASES, HEADERS.SUPPLIER_PURCHASES, data.purchase || {}, 'PUR') };
        break;
      case 'updateSupplierPurchase': {
        const updatedPurchase = updateByName_(SHEET_NAMES.SUPPLIER_PURCHASES, HEADERS.SUPPLIER_PURCHASES, data.purchase || {});
        result = updatedPurchase ? { success: true, data: updatedPurchase } : { success: false, message: 'Purchase not found' };
        break;
      }
      case 'deleteSupplierPurchase': {
        const deletedPurchase = deleteByName_(SHEET_NAMES.SUPPLIER_PURCHASES, HEADERS.SUPPLIER_PURCHASES, data.id);
        result = deletedPurchase ? { success: true, message: 'Purchase deleted' } : { success: false, message: 'Purchase not found' };
        break;
      }
      case 'getSupplierPayments':
        result = { success: true, data: readAllByName_(SHEET_NAMES.SUPPLIER_PAYMENTS, HEADERS.SUPPLIER_PAYMENTS) };
        break;
      case 'addSupplierPayment':
        result = { success: true, data: addByName_(SHEET_NAMES.SUPPLIER_PAYMENTS, HEADERS.SUPPLIER_PAYMENTS, data.payment || {}, 'PAY') };
        break;
      
      // Contact Log
      case 'addCustomerContact':
        result = addCustomerContact(data.contact || data);
        break;
      case 'getCustomerContacts':
        result = { success: true, data: getCustomerContacts(data.customer_id || data.customerId || data.id) };
        break;
      
      // Analytics
      case 'getCustomerStatistics':
        result = { success: true, data: getCustomerStatistics() };
        break;
      case 'getSupplierStatistics':
        result = { success: true, data: getSupplierStatistics() };
        break;
      
      // Initialize
      case 'initializeSheets':
        initializeSheets();
        result = { success: true, message: 'Sheets initialized successfully' };
        break;
      
      default:
        result = { success: false, message: `Unknown action: ${action}` };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== UTILITY FUNCTIONS ====================
function generateId(prefix) {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}${random}`.toUpperCase();
}

function objectFromRow(row, headers) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] || '';
  });
  return obj;
}

function rowFromObject(obj, headers) {
  return headers.map(header => obj[header] || '');
}

function ensureSheetWithHeadersByName_(sheetName, headers) {
  const safeHeaders = Array.isArray(headers) && headers.length ? headers : ['id'];
  const ss = getCRMSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(safeHeaders);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, safeHeaders.length).getValues()[0];
    const mismatch = safeHeaders.some((h, idx) => String(currentHeaders[idx] || '') !== h);
    if (mismatch) {
      sheet.getRange(1, 1, 1, safeHeaders.length).setValues([safeHeaders]);
    }
  }

  return sheet;
}

function readAllByName_(sheetName, headers) {
  const sheet = ensureSheetWithHeadersByName_(sheetName, headers);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headerRow = rows[0];
  return rows.slice(1)
    .filter(row => String(row[0] || '').trim() !== '')
    .map(row => objectFromRow(row, headerRow));
}

function addByName_(sheetName, headers, payload, prefix) {
  const sheet = ensureSheetWithHeadersByName_(sheetName, headers);
  const idPrefix = prefix || 'ROW';
  const rowPayload = { ...payload };
  if (!rowPayload.id) rowPayload.id = generateId(idPrefix);
  const row = rowFromObject(rowPayload, headers);
  sheet.appendRow(row);
  return rowPayload;
}

function updateByName_(sheetName, headers, payload) {
  const sheet = ensureSheetWithHeadersByName_(sheetName, headers);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return null;

  const rowId = String(payload.id || '');
  if (!rowId) return null;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') === rowId) {
      const current = objectFromRow(rows[i], headers);
      const updated = { ...current, ...payload };
      const row = rowFromObject(updated, headers);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return updated;
    }
  }

  return null;
}

function deleteByName_(sheetName, headers, idValue) {
  const sheet = ensureSheetWithHeadersByName_(sheetName, headers);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return false;

  const rowId = String(idValue || '');
  if (!rowId) return false;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') === rowId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  return false;
}

// ==================== TESTING ====================
function testApi() {
  // Initialize sheets
  initializeSheets();
  
  // Test add customer
  const customer = {
    name: 'Test Customer',
    phone: '+966501234567',
    email: 'test@example.com',
    company: 'Test Company',
    vat: '1234567890',
    address: 'Test Address',
    tag: 'VIP',
    credit_limit: 50000,
    payment_terms: 30,
    opening_balance: 1000,
    customer_type: 'Company'
  };
  
  const result = addCustomer(customer);
  Logger.log('Add Customer Result: ' + JSON.stringify(result));
  
  // Test get customers
  const customers = getCustomers();
  Logger.log('Customers Count: ' + customers.length);
  
  // Test customer statistics
  const stats = getCustomerStatistics();
  Logger.log('Customer Stats: ' + JSON.stringify(stats));
}


