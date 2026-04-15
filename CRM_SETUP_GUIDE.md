# 🎯 PROFESSIONAL CRM + SUPPLIER MANAGEMENT SYSTEM
## Complete Setup Guide

---

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Google Sheets Setup](#google-sheets-setup)
3. [Google Apps Script Setup](#google-apps-script-setup)
4. [Frontend Integration](#frontend-integration)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)

---

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **API**: REST via Google Apps Script Web App

### Data Models

#### Customers Table
```
id (auto-generated)
name (string)
phone (string)
email (string)
company (string)
vat (string)
address (text)
tag (VIP|Regular|New|Pending)
credit_limit (number)
payment_terms (7|15|30|45|60|90)
opening_balance (number)
opening_balance_type (Dr|Cr)
total_purchase (number - auto-calculated)
total_paid (number - auto-calculated)
due_amount (number - auto-calculated)
status (Active|Inactive)
customer_type (Individual|Company)
created_date (ISO date)
last_contact (date)
notes (text)
```

#### Suppliers Table
```
id (auto-generated)
name (string)
phone (string)
email (string)
company (string)
vat (string)
address (text)
payment_terms (7|15|30|45|60|90)
bank_name (string)
bank_account (string)
contact_person (string)
total_purchase (number - auto-calculated)
total_paid (number - auto-calculated)
due_amount (number - auto-calculated)
status (Active|Inactive)
created_date (ISO date)
notes (text)
```

#### Customer Transactions Table
```
id (auto-generated)
customer_id (reference to Customers)
type (Invoice|Payment|Credit Note|Adjustment)
amount (number)
date (date)
invoice_id (reference to Invoices)
note (text)
created_date (ISO date)
```

#### Supplier Transactions Table
```
id (auto-generated)
supplier_id (reference to Suppliers)
type (Purchase|Payment|Credit Note|Adjustment)
amount (number)
date (date)
purchase_id (reference)
note (text)
created_date (ISO date)
```

#### Customer Contacts Table
```
id (auto-generated)
customer_id (reference to Customers)
type (Call|WhatsApp|Email|SMS|Visit|Note)
message (text)
date (date)
created_date (ISO date)
```

---

## 📊 Google Sheets Setup

### Step 1: Create a New Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Create new spreadsheet"
3. Name it: **"Invoice System CRM"**
4. Click "Create"

### Step 2: Prepare the Spreadsheet
1. Delete the default "Sheet1" if needed
2. Right-click on sheet tab → "Rename"
3. Create sheets with exact names (case-sensitive):
   - `Customers`
   - `Suppliers`
   - `CustomerTransactions`
   - `SupplierTransactions`
   - `CustomerContacts`
   - `Settings`

### Step 3: Manual Header Setup (Optional - the script will auto-create)

**Customers Sheet - Headers:**
```
A: id
B: name
C: phone
D: email
E: company
F: vat
G: address
H: tag
I: credit_limit
J: payment_terms
K: opening_balance
L: opening_balance_type
M: total_purchase
N: total_paid
O: due_amount
P: status
Q: customer_type
R: created_date
S: last_contact
T: notes
```

**Suppliers Sheet - Headers:**
```
A: id
B: name
C: phone
D: email
E: company
F: vat
G: address
H: payment_terms
I: bank_name
J: bank_account
K: contact_person
L: total_purchase
M: total_paid
N: due_amount
O: status
P: created_date
Q: notes
```

**CustomerTransactions - Headers:**
```
A: id
B: customer_id
C: type
D: amount
E: date
F: invoice_id
G: note
H: created_date
```

**SupplierTransactions - Headers:**
```
A: id
B: supplier_id
C: type
D: amount
E: date
F: purchase_id
G: note
H: created_date
```

**CustomerContacts - Headers:**
```
A: id
B: customer_id
C: type
D: message
E: date
F: created_date
```

---

## 🔧 Google Apps Script Setup

### Step 1: Open Apps Script
1. In your Google Sheet, click **Tools** → **Script editor**
2. Delete the default `function myFunction() {}` code
3. Copy the entire **CRMBackend.gs** code (provided in the package)
4. Paste it into the editor
5. Click **Save**

### Step 2: Deploy as Web App

1. Click **Deploy** → **New Deployment**
2. Select type: **Web app**
3. Configure:
   - Execute as: **Your email address**
   - Who has access: **Anyone**
4. Click **Deploy**
5. A dialog will appear. Click on the web app URL
6. **Copy the deployment URL** - this is your API endpoint!

Example URL format:
```
https://script.google.com/macros/d/{SCRIPT-ID}/userweb?v={VERSION}
```

### Step 3: Test the Deployment

Open the URL in a browser. You might see:
```
{"success":false,"message":"Unknown action: undefined"}
```

This is normal - it means the API is working! The request just needs an action parameter.

### Step 4: Run Initialization (One Time)

In the Apps Script editor:
1. Click the **Play** button (▶) to run `testApi()`
2. Open **Execution log** to verify:
   - Google Sheets are created
   - Headers are added
   - Test data is added

This ensures your sheets are properly initialized.

---

## 🌐 Frontend Integration

### Step 1: Update API URL

In **app.js**, find this line (around line 10):
```javascript
window.API_URL = window.API_URL || "";
```

OR in **Settings** page, paste your Google Apps Script Web App URL in the "API Configuration" section.

### Step 2: Integration Points

Your existing `app.js` already has API infrastructure. Here's how to enhance it:

#### Customer Management Functions (Update these):

```javascript
// Replace existing syncCustomersFromApi()
async function syncCustomersFromApi() {
  try {
    const response = await APIClient.getData('getCustomers', { filters: {} });
    customers = response.map(normalizeCustomerFromApi);
    renderCustomers();
    updateDashboard();
  } catch (error) {
    console.error('Failed to sync customers:', error);
  }
}

// Add new function to save customer to API
async function saveCustomerToApi(customer) {
  try {
    if (customer.id && customer.id.startsWith('CUST-')) {
      // Update existing
      return await APIClient.postData('updateCustomer', {
        customer_id: customer.id,
        ...normalizeCustomerToApi(customer)
      });
    } else {
      // Add new
      return await APIClient.postData('addCustomer', 
        normalizeCustomerToApi(customer)
      );
    }
  } catch (error) {
    console.error('Failed to save customer:', error);
    throw error;
  }
}

// Add transaction recording
async function recordCustomerTransaction(customerId, transactionData) {
  try {
    return await APIClient.postData('addCustomerTransaction', {
      customer_id: customerId,
      ...transactionData
    });
  } catch (error) {
    console.error('Failed to record transaction:', error);
    throw error;
  }
}
```

#### Supplier Management Functions (Update these):

```javascript
// Replace existing syncSuppliersFromApi()
async function syncSuppliersFromApi() {
  try {
    const response = await APIClient.getData('getSuppliers', { filters: {} });
    suppliers = response.map(normalizeSupplierFromApi);
    renderSuppliers();
  } catch (error) {
    console.error('Failed to sync suppliers:', error);
  }
}

// Add new function to save supplier to API
async function saveSupplierToApi(supplier) {
  try {
    if (supplier.id && supplier.id.startsWith('SUP-')) {
      // Update existing
      return await APIClient.postData('updateSupplier', {
        supplier_id: supplier.id,
        ...normalizeSupplierToApi(supplier)
      });
    } else {
      // Add new
      return await APIClient.postData('addSupplier', 
        normalizeSupplierToApi(supplier)
      );
    }
  } catch (error) {
    console.error('Failed to save supplier:', error);
    throw error;
  }
}
```

---

## 📡 API Reference

### Base URL
```
{YOUR_GOOGLE_APPS_SCRIPT_URL}
```

### Request Format
All requests must be POST with JSON body:
```javascript
{
  "action": "ACTION_NAME",
  "param1": "value1",
  "param2": "value2"
}
```

### Available Actions

#### Customer Management

##### Get All Customers
```
Action: getCustomers
Parameters:
  - filters (optional): { tag, status, search }
Returns:
  Array of customer objects
```

Example:
```javascript
const customers = await APIClient.getData('getCustomers', {
  filters: { tag: 'VIP', status: 'Active' }
});
```

##### Get Single Customer
```
Action: getCustomerById
Parameters:
  - customer_id (required)
Returns:
  Customer object
```

##### Add Customer
```
Action: addCustomer
Parameters: customer object with fields:
  - name (required)
  - phone
  - email
  - company
  - vat
  - address
  - tag (default: 'New')
  - credit_limit
  - payment_terms
  - opening_balance
  - opening_balance_type
  - customer_type
  - status (default: 'Active')
  - notes
Returns:
  { success: boolean, message: string, data: customer }
```

##### Update Customer
```
Action: updateCustomer
Parameters:
  - customer_id (required)
  - field: value (any field to update)
Returns:
  { success: boolean, message: string, data: updated_customer }
```

##### Delete Customer
```
Action: deleteCustomer
Parameters:
  - customer_id (required)
Returns:
  { success: boolean, message: string }
```

#### Supplier Management

##### Get All Suppliers
```
Action: getSuppliers
Parameters:
  - filters (optional): { status, search }
Returns:
  Array of supplier objects
```

##### Get Single Supplier
```
Action: getSupplierById
Parameters:
  - supplier_id (required)
Returns:
  Supplier object
```

##### Add Supplier
```
Action: addSupplier
Parameters: supplier object with fields:
  - name (required)
  - phone
  - email
  - company
  - vat
  - address
  - payment_terms
  - bank_name
  - bank_account
  - contact_person
  - status
  - notes
Returns:
  { success: boolean, message: string, data: supplier }
```

##### Update Supplier
```
Action: updateSupplier
Parameters:
  - supplier_id (required)
  - field: value (any field to update)
Returns:
  { success: boolean, message: string, data: updated_supplier }
```

##### Delete Supplier
```
Action: deleteSupplier
Parameters:
  - supplier_id (required)
Returns:
  { success: boolean, message: string }
```

#### Transaction Management

##### Add Customer Transaction
```
Action: addCustomerTransaction
Parameters:
  - customer_id (required)
  - type (Invoice|Payment|Credit Note|Adjustment)
  - amount (required)
  - date (optional, defaults to today)
  - invoice_id (optional)
  - note (optional)
Returns:
  Transaction object
Notes:
  - Automatically updates customer totals and due amount
```

##### Get Customer Transactions
```
Action: getCustomerTransactions
Parameters:
  - customer_id (required)
Returns:
  Array of transaction objects
```

##### Add Supplier Transaction
```
Action: addSupplierTransaction
Parameters:
  - supplier_id (required)
  - type (Purchase|Payment|Credit Note|Adjustment)
  - amount (required)
  - date (optional)
  - purchase_id (optional)
  - note (optional)
Returns:
  Transaction object
Notes:
  - Automatically updates supplier totals and due amount
```

##### Get Supplier Transactions
```
Action: getSupplierTransactions
Parameters:
  - supplier_id (required)
Returns:
  Array of transaction objects
```

#### Contact Logging

##### Add Customer Contact
```
Action: addCustomerContact
Parameters:
  - customer_id (required)
  - type (Call|WhatsApp|Email|SMS|Visit|Note)
  - message (required)
  - date (optional)
Returns:
  Contact object
Notes:
  - Updates customer's last_contact field
```

##### Get Customer Contacts
```
Action: getCustomerContacts
Parameters:
  - customer_id (required)
Returns:
  Array of contact objects (sorted by date, newest first)
```

#### Analytics

##### Get Customer Statistics
```
Action: getCustomerStatistics
Returns:
  {
    total_customers: number,
    active_customers: number,
    total_credit_limit: number,
    total_due: number,
    total_purchase: number,
    total_paid: number,
    customer_tags: { tag: count }
  }
```

##### Get Supplier Statistics
```
Action: getSupplierStatistics
Returns:
  {
    total_suppliers: number,
    active_suppliers: number,
    total_due: number,
    total_purchase: number,
    total_paid: number
  }
```

---

## 💡 Usage Examples

### Example 1: Add New Customer with Opening Balance
```javascript
const newCustomer = {
  name: "Ahmed's Company",
  phone: "+966501234567",
  email: "ahmed@example.com",
  company: "Ahmed Trading",
  vat: "3001234567890",
  address: "Riyadh, KSA",
  tag: "VIP",
  credit_limit: 100000,
  payment_terms: 30,
  opening_balance: 50000,
  opening_balance_type: "Cr",  // Credit balance
  customer_type: "Company",
  status: "Active"
};

const result = await APIClient.postData('addCustomer', newCustomer);
if (result.success) {
  console.log('Customer added:', result.data);
}
```

### Example 2: Record Invoice Payment
```javascript
const transaction = {
  customer_id: "CUST-12345678ABC",
  type: "Invoice",
  amount: 15000,
  date: "2025-04-13",
  invoice_id: "INV-2001",
  note: "Invoice for April supplies"
};

const result = await APIClient.postData('addCustomerTransaction', transaction);

// Later, record payment
const payment = {
  customer_id: "CUST-12345678ABC",
  type: "Payment",
  amount: 15000,
  date: "2025-04-14",
  note: "Payment received via bank transfer"
};

await APIClient.postData('addCustomerTransaction', payment);
```

### Example 3: Track Customer Contact History
```javascript
// Log a phone call
await APIClient.postData('addCustomerContact', {
  customer_id: "CUST-12345678ABC",
  type: "Call",
  message: "Discussed Q2 requirements. Customer interested in bulk order."
});

// Log an email
await APIClient.postData('addCustomerContact', {
  customer_id: "CUST-12345678ABC",
  type: "Email",
  message: "Sent quotation for 500 units"
});

// Get all contacts for customer
const contacts = await APIClient.getData('getCustomerContacts', {
  customer_id: "CUST-12345678ABC"
});

contacts.forEach(contact => {
  console.log(`${contact.date} - ${contact.type}: ${contact.message}`);
});
```

### Example 4: Filter and Export Customers
```javascript
// Get all VIP customers
const vipCustomers = await APIClient.getData('getCustomers', {
  filters: { tag: 'VIP', status: 'Active' }
});

// Calculate total due
const totalDue = vipCustomers.reduce((sum, c) => sum + c.due_amount, 0);
console.log(`VIP Customers Total Due: ${totalDue}`);

// Export to Excel
const ws = XLSX.utils.json_to_sheet(vipCustomers);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "VIP Customers");
XLSX.writeFile(wb, "vip_customers.xlsx");
```

### Example 5: Financial Dashboard Update
```javascript
// Get customer statistics
const stats = await APIClient.getData('getCustomerStatistics');

// Update dashboard
document.getElementById('totalCustomers').textContent = stats.total_customers;
document.getElementById('totalDue').textContent = 
  formatCurrency(stats.total_due);
document.getElementById('collectionRate').textContent = 
  ((stats.total_paid / (stats.total_paid + stats.total_due)) * 100).toFixed(2) + '%';

// Display customer tags distribution
Object.entries(stats.customer_tags).forEach(([tag, count]) => {
  console.log(`${tag}: ${count} customers`);
});
```

---

## 🔐 Security Considerations

1. **Sharing**: Only share your Google Sheet with authorized users
2. **API URL**: Keep your Apps Script URL secret - don't expose in client code
3. **Validation**: The backend validates all inputs
4. **Read-only**: Implement row-level access control in Apps Script if needed
5. **Audit Trail**: All actions are timestamped in the database

---

## 🚀 Advanced Features

### Adding Custom Fields
Edit the `HEADERS` object in CRMBackend.gs to add more fields:
```javascript
HEADERS.CUSTOMERS = ['id', ..., 'your_new_field', ...]
```

### Adding More Contact Types
```javascript
CONTACT_TYPES: ['Call', 'WhatsApp', 'Email', 'SMS', 'Visit', 'Note', 'Your New Type']
```

### Custom Calculations
Edit functions like `calculateCustomerDue()` to implement custom business logic.

---

## 📞 Support

For issues:
1. Check the Apps Script execution log (Tools → Script editor → Execution log)
2. Verify Google Sheet structure matches the documentation
3. Test API with the provided test function: `testApi()`
4. Check network tab in browser dev tools for API response errors

---

## ✅ Checklist

- [ ] Created Google Sheet named "Invoice System CRM"
- [ ] Created all 6 required sheets with correct names
- [ ] Opened Google Apps Script editor from Tools menu
- [ ] Pasted entire CRMBackend.gs code
- [ ] Deployed as Web App
- [ ] Copied Web App URL
- [ ] Ran testApi() function in Apps Script
- [ ] Verified sheets are initialized
- [ ] Pasted API URL in frontend settings OR app.js
- [ ] Tested a customer API call in browser console
- [ ] Configured WhatsApp/Email integrations (optional)

---

**You now have a complete, professional CRM + Supplier Management System! 🎉**
