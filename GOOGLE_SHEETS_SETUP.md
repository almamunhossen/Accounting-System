# Google Sheets + Apps Script Setup

## 1) Deploy Backend
1. Open Google Sheets and create a new spreadsheet.
2. Open `Extensions -> Apps Script`.
3. Copy code from `google-apps-script/Code.gs` into Apps Script editor.
4. Save.
5. Deploy as Web App:
   - `Deploy -> New deployment`
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
6. Copy the deployed Web App URL.

## 2) Configure Frontend
1. Open `api.js`.
2. Set `window.API_URL` to your deployed Web App URL.

Example:
```js
window.API_URL = "https://script.google.com/macros/s/XXXX/exec";
```

## 3) Available Actions
- `getEmployees`, `addEmployee`
- `getAttendance`, `addAttendance`
- `getLeaves`, `addLeave`
- `getTasks`, `addTask`, `updateTask`
- `getCustomers`, `addCustomer`, `updateCustomer`
- `getSuppliers`, `addSupplier`, `updateSupplier`, `deleteSupplier`
- `getInvoices`, `addInvoice`, `updateInvoice`, `deleteInvoice`
- `getProducts`, `addProduct`, `updateProduct`, `deleteProduct`

## 4) Notes
- If API is not configured or fails, the app falls back to local cache.
- Invoices store `items` as JSON text.
- Required sheets are auto-created by Apps Script with headers on first use.

## 5) Supplier Management Template (Complete)
If you want a full supplier-focused system (Suppliers, Purchases, Payments, Products, Supplier Ledger, Dashboard) with formulas, dropdowns, filters, conditional formatting, and column protection:

1. Copy `google-apps-script/SupplierManagementTemplate.gs` into your Apps Script project.
2. Save and reload the spreadsheet.
3. Use menu: `Supplier System -> Setup Template`.

What it creates automatically:
- `Suppliers` with auto `SUP-` IDs and Active/Inactive dropdown.
- `Purchases` with auto `PUR-` IDs, supplier dropdown, `Total Amount = Quantity x Unit Price`, Paid/Due dropdown, Due highlight.
- `Payments` with auto `PAY-` IDs, supplier dropdown, optional purchase dropdown, Cash/Bank dropdown.
- `Products` with supplier dropdown and stock column.
- `Supplier Ledger` using SUMIF formulas:
   - `Total Purchase = SUMIF(Purchases!C:C, A2, Purchases!G:G)`
   - `Total Paid = SUMIF(Payments!C:C, A2, Payments!E:E)`
   - `Balance = Total Purchase - Total Paid`
- `Dashboard` with summary cards and charts.

Quality/guardrails applied:
- Header formatting, freeze top row, filters on all sheets.
- Formula columns protected from editing.
- Duplicate Supplier ID blocked.
